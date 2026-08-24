import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, postVisitSummaries, prescriptions, doctors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { submitNotesSchema } from '@/lib/validators';
import { generateLocalizedDischargeSummary } from '@/lib/ai/discharge-agent';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || (authUser.role !== 'DOCTOR' && authUser.role !== 'ADMIN') || !authUser.dbUser) {
      return NextResponse.json({ error: 'Doctor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = submitNotesSchema.parse(body);

    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, validated.appointmentId),
      with: { patient: true, doctor: true },
    });

    if (!appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Generate AI Localized Discharge Summary
    const dischargeResult = await generateLocalizedDischargeSummary(
      validated.notes,
      validated.targetLanguage,
      { name: appt.patient.name }
    );

    // Save post visit summary
    const [summaryRecord] = await db
      .insert(postVisitSummaries)
      .values({
        appointmentId: validated.appointmentId,
        physicianNotes: validated.notes,
        aiDischargeSummary: dischargeResult.data || null,
        targetLanguage: validated.targetLanguage,
        status: dischargeResult.success ? 'PROCESSED' : 'LLM_FAILED',
      })
      .returning();

    // If medications provided, create prescription
    let prescriptionRecord = null;
    if (validated.medications && validated.medications.length > 0) {
      const defaultEndDate = new Date();
      defaultEndDate.setDate(defaultEndDate.getDate() + 7);
      const endDateStr = validated.reminderEndDate || defaultEndDate.toISOString().split('T')[0];

      const [rx] = await db
        .insert(prescriptions)
        .values({
          appointmentId: validated.appointmentId,
          patientId: appt.patientId,
          medications: validated.medications,
          reminderFrequency: validated.reminderFrequency || 'DAILY',
          reminderEndDate: endDateStr,
          isActive: true,
        })
        .returning();

      prescriptionRecord = rx;
    }

    // Mark appointment as COMPLETED
    await db
      .update(appointments)
      .set({ status: 'COMPLETED' })
      .where(eq(appointments.id, validated.appointmentId));

    return NextResponse.json({
      status: 'success',
      postVisitSummary: summaryRecord,
      prescription: prescriptionRecord,
    });
  } catch (error: any) {
    console.error('Failed to submit clinical notes:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit clinical notes' }, { status: 400 });
  }
}
