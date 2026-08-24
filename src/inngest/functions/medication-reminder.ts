import { inngest } from '../client';
import { db } from '@/db';
import { prescriptions, users } from '@/db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { sendEmailWithFallback } from '@/lib/email/provider';

export const dailyMedicationReminder = inngest.createFunction(
  {
    id: 'daily-medication-reminder',
    triggers: [{ cron: '0 8 * * *' }], // Run at 8 AM daily
  },
  async ({ step }: { step: any }) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const activePrescriptions = await step.run('fetch-active-prescriptions', async () => {
      const rxList = await db
        .select()
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.isActive, true),
            gte(prescriptions.reminderEndDate, todayStr)
          )
        );

      if (rxList.length === 0) return [];

      const patientIds = Array.from(new Set(rxList.map((r) => r.patientId)));
      const patientList = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          language: users.language,
        })
        .from(users)
        .where(inArray(users.id, patientIds));

      const patientMap = new Map(patientList.map((p) => [p.id, p]));

      return rxList.map((rx) => ({
        ...rx,
        patient: patientMap.get(rx.patientId) || null,
      }));
    });

    for (const rx of activePrescriptions) {
      if (rx.patient?.email) {
        await step.run(`remind-${rx.id}`, async () => {
          await sendEmailWithFallback({
            to: rx.patient!.email,
            subject: 'Daily Medication Reminder',
            template: 'medication-reminder',
            locale: rx.patient?.language || 'en',
            context: {
              patientName: rx.patient?.name || 'Patient',
              medications: rx.medications,
            },
          });
        });
      }
    }

    return { status: 'MEDICATION_REMINDERS_PROCESSED', count: activePrescriptions.length };
  }
);
