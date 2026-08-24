import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, setUserRole } from '@/lib/firebase/admin';
import { db } from '@/db';
import { users, doctors } from '@/db/schema';
import { userRegisterSchema } from '@/lib/validators';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = userRegisterSchema.parse(body);

    // Verify Firebase Admin configuration
    if (!adminAuth || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      return NextResponse.json(
        {
          error:
            'Firebase Admin credentials are missing. Please add FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in your Vercel Environment Variables.',
        },
        { status: 500 }
      );
    }

    let firebaseUser;
    try {
      firebaseUser = await adminAuth.createUser({
        email: validated.email,
        password: validated.password,
        displayName: validated.name,
        phoneNumber: validated.phone || undefined,
      });
    } catch (firebaseErr: any) {
      if (firebaseErr.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: firebaseErr.message || 'Firebase account creation failed' },
        { status: 400 }
      );
    }

    // Set custom role claim in Firebase Auth
    try {
      await setUserRole(firebaseUser.uid, validated.role);
    } catch (roleErr) {
      console.warn('Could not set custom role claim:', roleErr);
    }

    // Insert user into PostgreSQL
    const [newUser] = await db
      .insert(users)
      .values({
        firebaseUid: firebaseUser.uid,
        name: validated.name,
        email: validated.email,
        role: validated.role,
        phone: validated.phone || null,
        language: validated.language,
      })
      .returning();

    // If registered as DOCTOR, automatically create initial doctor profile
    if (validated.role === 'DOCTOR') {
      await db.insert(doctors).values({
        userId: newUser.id,
        name: validated.name,
        specialty: 'General Medicine',
        qualifications: 'MBBS',
        languagesSpoken: [validated.language],
        workingHours: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
        },
        slotDurationMinutes: 30,
        isActive: true,
      });
    }

    return NextResponse.json({
      status: 'success',
      user: {
        id: newUser.id,
        uid: firebaseUser.uid,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error('Registration failed:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
