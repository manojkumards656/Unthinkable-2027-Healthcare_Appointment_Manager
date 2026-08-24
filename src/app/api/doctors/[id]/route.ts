import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.id, id),
      with: {
        user: {
          columns: {
            email: true,
            phone: true,
            language: true,
          },
        },
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    return NextResponse.json({ doctor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch doctor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
      .update(doctors)
      .set({
        ...body,
      })
      .where(eq(doctors.id, id))
      .returning();

    return NextResponse.json({ status: 'success', doctor: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update doctor' }, { status: 400 });
  }
}
