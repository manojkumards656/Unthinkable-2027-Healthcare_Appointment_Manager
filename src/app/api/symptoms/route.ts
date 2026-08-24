import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { symptomSubmissions, appointments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { submitSymptomsSchema } from '@/lib/validators';
import { processPatientIntake } from '@/lib/ai/intake-agent';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = submitSymptomsSchema.parse(body);

    // Verify appointment exists
    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, validated.appointmentId),
    });

    if (!appt || (appt.patientId !== authUser.dbUser.id && authUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Appointment not found or unauthorized' }, { status: 403 });
    }

    // Process AI intake triage
    const triageResult = await processPatientIntake(
      validated.symptoms,
      validated.language,
      {
        name: authUser.dbUser.name,
        email: authUser.dbUser.email,
        phone: authUser.dbUser.phone || undefined,
      }
    );

    const [submission] = await db
      .insert(symptomSubmissions)
      .values({
        appointmentId: validated.appointmentId,
        patientId: authUser.dbUser.id,
        rawText: validated.symptoms,
        inputLanguage: validated.language,
        aiTriageSummary: triageResult.data || null,
        urgencyLevel: (triageResult.data?.urgencyLevel?.toUpperCase() as any) || 'MEDIUM',
        status: triageResult.success ? 'PROCESSED' : 'LLM_FAILED',
      })
      .returning();

    return NextResponse.json({
      status: 'success',
      submission,
      aiSummary: triageResult.data,
    });
  } catch (error: any) {
    console.error('Failed to submit symptoms:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit symptoms' }, { status: 400 });
  }
}
