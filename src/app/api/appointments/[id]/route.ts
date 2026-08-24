import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, slots, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { deleteAppointmentEvent } from '@/lib/google-calendar/events';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
      with: {
        patient: true,
        doctor: true,
        slot: true,
        symptomSubmission: true,
        postVisitSummary: true,
        prescriptions: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Permission check
    const isPatient = appointment.patientId === authUser.dbUser.id;
    const isDoctor = appointment.doctor.userId === authUser.dbUser.id;
    const isAdmin = authUser.role === 'ADMIN';

    if (!isPatient && !isDoctor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ appointment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch appointment' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body; // action: 'CANCEL'

    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
      with: { patient: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (action === 'CANCEL') {
      const cancelStatus =
        authUser.role === 'DOCTOR' ? 'CANCELLED_BY_PROVIDER' : 'CANCELLED_BY_PATIENT';

      // 1. Update appointment status
      const [updated] = await db
        .update(appointments)
        .set({
          status: cancelStatus,
          cancellationReason: reason || 'Cancelled by user',
        })
        .where(eq(appointments.id, id))
        .returning();

      // 2. Release slot back to AVAILABLE
      await db
        .update(slots)
        .set({ status: 'AVAILABLE' })
        .where(eq(slots.id, appointment.slotId));

      // 3. Clean up Google Calendar event if present
      if (
        appointment.googleCalendarEventId &&
        appointment.patient.googleCalendarRefreshToken
      ) {
        deleteAppointmentEvent(
          appointment.patient.googleCalendarRefreshToken,
          appointment.googleCalendarEventId
        ).catch((e) => console.error('Calendar deletion error:', e));
      }

      return NextResponse.json({ status: 'success', appointment: updated });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to update appointment:', error);
    return NextResponse.json({ error: error.message || 'Failed to update appointment' }, { status: 500 });
  }
}
