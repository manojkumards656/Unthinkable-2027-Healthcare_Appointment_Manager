import { inngest } from '../client';
import { sendEmailWithFallback } from '@/lib/email/provider';

export const appointmentReminder = inngest.createFunction(
  {
    id: 'appointment-reminder',
    triggers: [{ event: 'appointment/booked' }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { patientEmail, patientLanguage, appointmentTimestamp, doctorName, patientName } = event.data as {
      patientEmail: string;
      patientLanguage?: string;
      appointmentTimestamp: string;
      doctorName: string;
      patientName?: string;
    };

    // Calculate 24 hours prior to appointment
    const apptTime = new Date(appointmentTimestamp);
    const reminderTime = new Date(apptTime.getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();

    if (reminderTime > now) {
      const sleepMs = reminderTime.getTime() - now.getTime();
      await step.sleep('wait-for-reminder-time', sleepMs);
    }

    // Send reminder to patient
    await step.run('send-patient-reminder', async () => {
      await sendEmailWithFallback({
        to: patientEmail,
        subject: 'Appointment Reminder - Tomorrow',
        template: 'booking-reminder',
        locale: patientLanguage || 'en',
        context: {
          patientName: patientName || 'Patient',
          appointmentDate: appointmentTimestamp,
          doctorName: doctorName,
        },
      });
    });

    return { status: 'REMINDER_SENT', recipient: patientEmail };
  }
);
