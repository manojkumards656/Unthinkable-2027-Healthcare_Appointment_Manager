import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctorLeaves, doctors } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { requestLeaveSchema } from '@/lib/validators';
import { inngest } from '@/inngest/client';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let leaves;
    if (authUser.role === 'DOCTOR') {
      const doctorProfile = await db.query.doctors.findFirst({
        where: eq(doctors.userId, authUser.dbUser.id),
      });
      if (!doctorProfile) return NextResponse.json({ leaves: [] });

      leaves = await db.query.doctorLeaves.findMany({
        where: eq(doctorLeaves.doctorId, doctorProfile.id),
        orderBy: [desc(doctorLeaves.createdAt)],
      });
    } else if (authUser.role === 'ADMIN') {
      leaves = await db.query.doctorLeaves.findMany({
        orderBy: [desc(doctorLeaves.createdAt)],
        with: { doctor: true },
      });
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ leaves });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list leaves' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.dbUser || (authUser.role !== 'DOCTOR' && authUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Doctor authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = requestLeaveSchema.parse(body);

    let doctorId = validated.doctorId;
    if (!doctorId) {
      const doctorProfile = await db.query.doctors.findFirst({
        where: eq(doctors.userId, authUser.dbUser.id),
      });
      if (!doctorProfile) {
        return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
      }
      doctorId = doctorProfile.id;
    }

    const [leave] = await db
      .insert(doctorLeaves)
      .values({
        doctorId,
        startDate: validated.startDate,
        endDate: validated.endDate,
        reason: validated.reason || null,
        status: authUser.role === 'ADMIN' ? 'APPROVED' : 'PENDING',
      })
      .returning();

    // If submitted by Admin directly as APPROVED, trigger Inngest saga immediately
    if (leave.status === 'APPROVED') {
      await inngest.send({
        name: 'doctor/leave.declared',
        data: {
          doctorId,
          startDate: validated.startDate,
          endDate: validated.endDate,
          reason: validated.reason || 'Provider Leave',
        },
      });
    }

    return NextResponse.json({ status: 'success', leave });
  } catch (error: any) {
    console.error('Failed to submit leave request:', error);
    return NextResponse.json({ error: error.message || 'Failed to request leave' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { leaveId, status } = body as { leaveId: string; status: 'APPROVED' | 'REJECTED' };

    if (!leaveId || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid leaveId or status' }, { status: 400 });
    }

    const [updatedLeave] = await db
      .update(doctorLeaves)
      .set({ status })
      .where(eq(doctorLeaves.id, leaveId))
      .returning();

    if (!updatedLeave) {
      return NextResponse.json({ error: 'Leave record not found' }, { status: 404 });
    }

    // If approved by admin, trigger the Inngest Saga
    if (status === 'APPROVED') {
      await inngest.send({
        name: 'doctor/leave.declared',
        data: {
          doctorId: updatedLeave.doctorId,
          startDate: updatedLeave.startDate,
          endDate: updatedLeave.endDate,
          reason: updatedLeave.reason || 'Provider Leave',
        },
      });
    }

    return NextResponse.json({ status: 'success', leave: updatedLeave });
  } catch (error: any) {
    console.error('Failed to update leave status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update leave' }, { status: 400 });
  }
}

export const PATCH = PUT;

