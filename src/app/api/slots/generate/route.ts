import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { generateSlotsForAllDoctors, generateSlotsForDoctor } from '@/lib/services/slot-generation-service';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { doctorId, days = 7, startDate = new Date().toISOString() } = body;

    const start = new Date(startDate);

    let slotsCreated = 0;
    if (doctorId) {
      for (let d = 0; d < days; d++) {
        const current = new Date(start);
        current.setDate(current.getDate() + d);
        slotsCreated += await generateSlotsForDoctor(doctorId, current);
      }
    } else {
      slotsCreated = await generateSlotsForAllDoctors(start, days);
    }

    return NextResponse.json({
      status: 'success',
      slotsGenerated: slotsCreated,
      daysCovered: days,
    });
  } catch (error: any) {
    console.error('Failed to generate slots:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate slots' }, { status: 500 });
  }
}
