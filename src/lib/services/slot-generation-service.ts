import { db } from '@/db';
import { slots, doctors } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export async function generateSlotsForDoctor(
  doctorId: string,
  date: Date
): Promise<number> {
  const doctor = await db.query.doctors.findFirst({
    where: eq(doctors.id, doctorId),
  });

  if (!doctor || !doctor.isActive) return 0;

  const dayOfWeek = DAY_NAMES[date.getDay()];
  const workingHours = doctor.workingHours as Record<string, { start: string; end: string }> | null;
  const daySchedule = workingHours?.[dayOfWeek];

  if (!daySchedule || !daySchedule.start || !daySchedule.end) {
    return 0; // Doctor does not work on this day
  }

  const [startHour, startMin] = daySchedule.start.split(':').map(Number);
  const [endHour, endMin] = daySchedule.end.split(':').map(Number);
  const durationMin = doctor.slotDurationMinutes || 30;

  const slotsToCreate = [];
  const current = new Date(date);
  current.setHours(startHour, startMin, 0, 0);

  const endTime = new Date(date);
  endTime.setHours(endHour, endMin, 0, 0);

  while (current.getTime() + durationMin * 60 * 1000 <= endTime.getTime()) {
    const slotEnd = new Date(current.getTime() + durationMin * 60 * 1000);
    slotsToCreate.push({
      doctorId,
      slotTimestamp: new Date(current),
      endTimestamp: slotEnd,
      status: 'AVAILABLE' as const,
    });
    current.setTime(slotEnd.getTime());
  }

  if (slotsToCreate.length > 0) {
    await db.insert(slots).values(slotsToCreate).onConflictDoNothing();
  }

  return slotsToCreate.length;
}

export async function generateSlotsForAllDoctors(
  startDate: Date,
  daysCount: number
): Promise<number> {
  const activeDoctors = await db.query.doctors.findMany({
    where: eq(doctors.isActive, true),
  });

  let totalSlots = 0;
  for (const doctor of activeDoctors) {
    for (let i = 0; i < daysCount; i++) {
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + i);
      const generated = await generateSlotsForDoctor(doctor.id, targetDate);
      totalSlots += generated;
    }
  }

  return totalSlots;
}
