import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctors, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { createDoctorSchema } from '@/lib/validators';
import { adminAuth, setUserRole } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const language = searchParams.get('language');

    let doctorList = await db.query.doctors.findMany({
      where: eq(doctors.isActive, true),
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

    if (specialty) {
      doctorList = doctorList.filter(
        (d) => d.specialty.toLowerCase() === specialty.toLowerCase()
      );
    }

    if (language) {
      doctorList = doctorList.filter((d) => {
        const langs = Array.isArray(d.languagesSpoken) ? d.languagesSpoken : [];
        return langs.includes(language);
      });
    }

    return NextResponse.json({ doctors: doctorList });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve doctors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createDoctorSchema.parse(body);

    // Create Firebase user for doctor if email doesn't exist
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(validated.email);
    } catch {
      firebaseUser = await adminAuth.createUser({
        email: validated.email,
        displayName: validated.name,
        password: 'DoctorTempPassword123!',
      });
    }

    await setUserRole(firebaseUser.uid, 'DOCTOR');

    // Create or find user in DB
    let userRecord = await db.query.users.findFirst({
      where: eq(users.email, validated.email),
    });

    if (!userRecord) {
      const [newU] = await db
        .insert(users)
        .values({
          firebaseUid: firebaseUser.uid,
          name: validated.name,
          email: validated.email,
          role: 'DOCTOR',
          language: (validated.languagesSpoken[0] as any) || 'en',
        })
        .returning();
      userRecord = newU;
    }

    // Insert Doctor record
    const [newDoctor] = await db
      .insert(doctors)
      .values({
        userId: userRecord.id,
        name: validated.name,
        specialty: validated.specialty,
        qualifications: validated.qualifications || null,
        languagesSpoken: validated.languagesSpoken,
        workingHours: validated.workingHours,
        slotDurationMinutes: validated.slotDurationMinutes || 30,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ status: 'success', doctor: newDoctor });
  } catch (error: any) {
    console.error('Failed to create doctor profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create doctor' },
      { status: 400 }
    );
  }
}
