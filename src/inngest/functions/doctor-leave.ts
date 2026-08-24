import { inngest } from '../client';
import { db } from '@/db';
import { appointments, slots, users } from '@/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { getRedisClient } from '@/lib/redis';
import crypto from 'crypto';
import { sendEmailWithFallback } from '@/lib/email/provider';


export const propagateDoctorLeaveSaga = inngest.createFunction(
  {
    id: 'propagate-doctor-leave-saga',
    retries: 5,
    triggers: [{ event: 'doctor/leave.declared' }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { doctorId, startDate, endDate, reason } = event.data as {
      doctorId: string;
      startDate: string;
      endDate: string;
      reason?: string;
    };

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    // STEP 1 — Bulk update slots and invalidate active appointments
    const cancelledAppointments = await step.run('cancel-conflicting-bookings', async () => {
      return await db.transaction(async (tx) => {
        // 1a. Invalidate slots
        await tx
          .update(slots)
          .set({ status: 'UNAVAILABLE' })
          .where(
            and(
              eq(slots.doctorId, doctorId),
              gte(slots.slotTimestamp, startDateTime),
              lte(slots.slotTimestamp, endDateTime)
            )
          );

        // 1b. Cancel active bookings
        const updatedAppointments = await tx
          .update(appointments)
          .set({
            status: 'CANCELLED_BY_PROVIDER',
            cancellationReason: reason || 'Provider Emergency Leave',
          })
          .where(
            and(
              eq(appointments.doctorId, doctorId),
              gte(appointments.appointmentTimestamp, startDateTime),
              lte(appointments.appointmentTimestamp, endDateTime),
              inArray(appointments.status, ['PENDING', 'CONFIRMED'])
            )
          )
          .returning({
            id: appointments.id,
            patientId: appointments.patientId,
            appointmentTimestamp: appointments.appointmentTimestamp,
          });

        if (updatedAppointments.length === 0) {
          return [];
        }

        // Fetch patient metadata for localized email dispatch
        const patientIds = Array.from(new Set(updatedAppointments.map((a) => a.patientId)));
        const patientRecords = await tx
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            language: users.language,
          })
          .from(users)
          .where(inArray(users.id, patientIds));

        const patientMap = new Map(patientRecords.map((p) => [p.id, p]));

        return updatedAppointments.map((appt) => {
          const patient = patientMap.get(appt.patientId);
          return {
            id: appt.id,
            patientId: appt.patientId,
            appointmentTimestamp: appt.appointmentTimestamp,
            patientEmail: patient?.email || '',
            patientName: patient?.name || 'Valued Patient',
            patientLanguage: patient?.language || 'en',
          };
        });
      });
    });

    if (!cancelledAppointments || cancelledAppointments.length === 0) {
      return { status: 'COMPLETED', cancelledCount: 0 };
    }

    // STEP 2 — Generate Priority Reschedule Tokens with 72h TTL in Redis
    const reschedulePayloads = await step.run('generate-reschedule-tokens', async () => {
      const redis = getRedisClient();
      const payloads = [];

      for (const appt of cancelledAppointments) {
        const priorityToken = crypto.randomUUID();
        if (redis) {
          try {
            await redis.set(
              `reschedule:token:${priorityToken}`,
              JSON.stringify({
                patientId: appt.patientId,
                originalAppointmentId: appt.id,
                doctorId,
              }),
              { px: 259200000 } // 72 hours TTL
            );
          } catch (e) {
            console.error('Redis token caching error:', e);
          }
        }

        payloads.push({
          ...appt,
          priorityToken,
        });
      }

      return payloads;
    });

    // STEP 3 — Fan-out isolated email dispatches per affected patient
    for (const payload of reschedulePayloads) {
      await step.run(`notify-patient-${payload.id}`, async () => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const rescheduleLink = `${appUrl}/${payload.patientLanguage}/reschedule?token=${payload.priorityToken}`;

        await sendEmailWithFallback({
          to: payload.patientEmail,
          subject: 'Important: Appointment Rescheduling Required',
          template: 'doctor-leave-notification',
          locale: payload.patientLanguage,
          context: {
            patientName: payload.patientName,
            appointmentDate: payload.appointmentTimestamp,
            rescheduleLink,
          },
        });
      });
    }

    return {
      status: 'SUCCESS',
      cancelledCount: cancelledAppointments.length,
    };
  }
);
