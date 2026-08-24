import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, symptomSubmissions, users, doctors, slots } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { bookAppointmentSchema } from '@/lib/validators';
import { processSlotBooking } from '@/lib/services/booking-service';
import { processPatientIntake } from '@/lib/ai/intake-agent';
import { sendEmailWithFallback } from '@/lib/email/provider';
import { inngest } from '@/inngest/client';
import { createAppointmentEvent } from '@/lib/google-calendar/events';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let appointmentList;

    if (authUser.role === 'PATIENT') {
      appointmentList = await db.query.appointments.findMany({
        where: eq(appointments.patientId, authUser.dbUser.id),
        orderBy: [desc(appointments.appointmentTimestamp)],
        with: {
          doctor: true,
          slot: true,
          symptomSubmission: true,
          postVisitSummary: true,
          prescriptions: true,
        },
      });
    } else if (authUser.role === 'DOCTOR') {
      const doctorProfile = await db.query.doctors.findFirst({
        where: eq(doctors.userId, authUser.dbUser.id),
      });

      if (!doctorProfile) {
        return NextResponse.json({ appointments: [] });
      }

      appointmentList = await db.query.appointments.findMany({
        where: eq(appointments.doctorId, doctorProfile.id),
        orderBy: [desc(appointments.appointmentTimestamp)],
        with: {
          patient: {
            columns: {
              id: true,
              name: true,
              email: true,
              phone: true,
              language: true,
            },
          },
          slot: true,
          symptomSubmission: true,
          postVisitSummary: true,
          prescriptions: true,
        },
      });
    } else {
      // ADMIN
      appointmentList = await db.query.appointments.findMany({
        orderBy: [desc(appointments.appointmentTimestamp)],
        with: {
          patient: true,
          doctor: true,
          slot: true,
        },
      });
    }

    return NextResponse.json({ appointments: appointmentList });
  } catch (error: any) {
    console.error('Failed to list appointments:', error);
    return NextResponse.json({ error: error.message || 'Failed to list appointments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = bookAppointmentSchema.parse(body);

    const slotDate = new Date(validated.slotTimestamp);

    // 1. Two-Tier Concurrency-Safe Booking Engine
    const bookingResult = await processSlotBooking(
      authUser.dbUser.id,
      validated.doctorId,
      validated.slotId,
      slotDate
    );

    if (!bookingResult.success) {
      const isConflict =
        bookingResult.error === 'CONFLICT_DOUBLE_BOOKING' ||
        bookingResult.error === 'SLOT_BUSY';
      return NextResponse.json(
        { error: bookingResult.error || 'Failed to reserve appointment slot' },
        { status: isConflict ? 409 : 400 }
      );
    }

    const appointmentId = bookingResult.appointmentId!;

    // 2. Fetch doctor details for notifications and calendar
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.id, validated.doctorId),
      with: { user: true },
    });

    // 3. Process Symptoms Intake if provided
    if (validated.symptoms) {
      try {
        const triageResult = await processPatientIntake(
          validated.symptoms,
          validated.inputLanguage || authUser.dbUser.language,
          {
            name: authUser.dbUser.name,
            email: authUser.dbUser.email,
            phone: authUser.dbUser.phone || undefined,
          }
        );

        await db.insert(symptomSubmissions).values({
          appointmentId,
          patientId: authUser.dbUser.id,
          rawText: validated.symptoms,
          inputLanguage: validated.inputLanguage || authUser.dbUser.language,
          aiTriageSummary: triageResult.data || null,
          urgencyLevel: (triageResult.data?.urgencyLevel?.toUpperCase() as any) || 'MEDIUM',
          status: triageResult.success ? 'PROCESSED' : 'LLM_FAILED',
        });
      } catch (symptomErr) {
        console.error('Failed to process AI symptom triage:', symptomErr);
        // Fallback: save raw text without blocking booking
        await db.insert(symptomSubmissions).values({
          appointmentId,
          patientId: authUser.dbUser.id,
          rawText: validated.symptoms,
          inputLanguage: validated.inputLanguage || authUser.dbUser.language,
          status: 'LLM_FAILED',
        });
      }
    }

    // 4. Update appointment to CONFIRMED
    await db
      .update(appointments)
      .set({ status: 'CONFIRMED' })
      .where(eq(appointments.id, appointmentId));

    // Also update slot to BOOKED
    await db
      .update(slots)
      .set({ status: 'BOOKED' })
      .where(eq(slots.id, validated.slotId));

    // 5. Google Calendar Sync (if refresh token exists)
    if (authUser.dbUser.googleCalendarRefreshToken && doctor) {
      try {
        const slotEnd = new Date(slotDate.getTime() + 30 * 60 * 1000);
        const eventId = await createAppointmentEvent(authUser.dbUser.googleCalendarRefreshToken, {
          doctorName: doctor.name,
          patientName: authUser.dbUser.name,
          startTime: slotDate,
          endTime: slotEnd,
        });
        if (eventId) {
          await db
            .update(appointments)
            .set({ googleCalendarEventId: eventId })
            .where(eq(appointments.id, appointmentId));
        }
      } catch (calErr) {
        console.error('Google calendar event creation error:', calErr);
      }
    }

    // 6. Send transactional confirmation email
    sendEmailWithFallback({
      to: authUser.dbUser.email,
      subject: 'Appointment Confirmed',
      template: 'booking-confirmation',
      locale: authUser.dbUser.language || 'en',
      context: {
        patientName: authUser.dbUser.name,
        doctorName: doctor?.name || 'Doctor',
        appointmentDate: slotDate.toISOString(),
      },
    }).catch((e) => console.error('Confirmation email error:', e));

    // 7. Trigger Inngest 24-hour reminder workflow
    inngest
      .send({
        name: 'appointment/booked',
        data: {
          appointmentId,
          patientEmail: authUser.dbUser.email,
          patientName: authUser.dbUser.name,
          patientLanguage: authUser.dbUser.language,
          doctorName: doctor?.name || 'Doctor',
          appointmentTimestamp: slotDate.toISOString(),
        },
      })
      .catch((e) => console.error('Inngest reminder dispatch error:', e));

    return NextResponse.json({
      status: 'success',
      appointmentId,
      message: 'Appointment booked and confirmed',
    });
  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: error.message || 'Failed to book appointment' }, { status: 400 });
  }
}
