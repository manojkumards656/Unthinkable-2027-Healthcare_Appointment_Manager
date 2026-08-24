import { inngest } from '../client';
import { generateSlotsForAllDoctors } from '@/lib/services/slot-generation-service';

export const dailySlotGeneration = inngest.createFunction(
  {
    id: 'daily-slot-generation',
    triggers: [{ cron: '0 0 * * *' }], // Run at midnight daily
  },
  async ({ step }: { step: any }) => {
    const result = await step.run('generate-slots-7-days', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return await generateSlotsForAllDoctors(tomorrow, 7);
    });
    return { slotsGenerated: result };
  }
);
