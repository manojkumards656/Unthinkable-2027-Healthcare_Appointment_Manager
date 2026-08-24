import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { slots } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { generateSlotsForDoctor } from '@/lib/services/slot-generation-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const dateStr = searchParams.get('date'); // YYYY-MM-DD

    if (!doctorId || !dateStr) {
      return NextResponse.json({ error: 'Missing doctorId or date query parameter' }, { status: 400 });
    }

    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);

    // Fetch existing slots
    let slotList = await db
      .select()
      .from(slots)
      .where(
        and(
          eq(slots.doctorId, doctorId),
          gte(slots.slotTimestamp, startDate),
          lte(slots.slotTimestamp, endDate)
        )
      )
      .orderBy(slots.slotTimestamp);

    // If no slots exist for this date, automatically generate them from doctor working hours
    if (slotList.length === 0) {
      await generateSlotsForDoctor(doctorId, startDate);
      slotList = await db
        .select()
        .from(slots)
        .where(
          and(
            eq(slots.doctorId, doctorId),
            gte(slots.slotTimestamp, startDate),
            lte(slots.slotTimestamp, endDate)
          )
        )
        .orderBy(slots.slotTimestamp);
    }

    return NextResponse.json({ slots: slotList });
  } catch (error: any) {
    console.error('Failed to fetch slots:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch slots' }, { status: 500 });
  }
}
