import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { propagateDoctorLeaveSaga } from '@/inngest/functions/doctor-leave';
import { dailySlotGeneration } from '@/inngest/functions/slot-generation';
import { appointmentReminder } from '@/inngest/functions/appointment-reminder';
import { dailyMedicationReminder } from '@/inngest/functions/medication-reminder';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    propagateDoctorLeaveSaga,
    dailySlotGeneration,
    appointmentReminder,
    dailyMedicationReminder,
  ],
});
