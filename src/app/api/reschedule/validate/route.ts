import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { db } from '@/db';
import { doctors, appointments, slots } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processSlotBooking } from '@/lib/services/booking-service';

function getRedisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing reschedule token' }, { status: 400 });
    }

    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json({ error: 'Redis is not configured' }, { status: 500 });
    }

    const data = await redis.get(`reschedule:token:${token}`);
    if (!data) {
      return NextResponse.json({ valid: false, error: 'Token expired or invalid' }, { status: 404 });
    }

    const payload = typeof data === 'string' ? JSON.parse(data) : data;

    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.id, payload.doctorId),
    });

    return NextResponse.json({
      valid: true,
      payload,
      doctor,
    });
  } catch (error: any) {
    console.error('Failed to validate reschedule token:', error);
    return NextResponse.json({ error: error.message || 'Validation failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, slotId, slotTimestamp } = body;

    if (!token || !slotId || !slotTimestamp) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json({ error: 'Redis is not configured' }, { status: 500 });
    }

    const data = await redis.get(`reschedule:token:${token}`);
    if (!data) {
      return NextResponse.json({ error: 'Token expired or already used' }, { status: 404 });
    }

    const payload = typeof data === 'string' ? JSON.parse(data) : data;

    // Concurrency booking
    const bookingResult = await processSlotBooking(
      payload.patientId,
      payload.doctorId,
      slotId,
      new Date(slotTimestamp)
    );

    if (!bookingResult.success) {
      return NextResponse.json(
        { error: bookingResult.error || 'Failed to reserve selected slot' },
        { status: 400 }
      );
    }

    // Confirm new appointment
    await db
      .update(appointments)
      .set({ status: 'CONFIRMED' })
      .where(eq(appointments.id, bookingResult.appointmentId!));

    await db
      .update(slots)
      .set({ status: 'BOOKED' })
      .where(eq(slots.id, slotId));

    // Invalidate the priority token once consumed
    await redis.del(`reschedule:token:${token}`);

    return NextResponse.json({
      status: 'success',
      appointmentId: bookingResult.appointmentId,
    });
  } catch (error: any) {
    console.error('Failed to process priority reschedule:', error);
    return NextResponse.json({ error: error.message || 'Reschedule failed' }, { status: 400 });
  }
}
