import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  dbUser?: typeof users.$inferSelect;
}

export async function getAuthenticatedUser(request?: Request): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    let idToken = '';
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        idToken = authHeader.substring(7);
      }
    }

    let decodedToken: any = null;

    if (sessionCookie) {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } else if (idToken) {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    }

    if (!decodedToken) return null;

    const dbUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
    });

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: (dbUser?.role || decodedToken.role || 'PATIENT') as any,
      dbUser,
    };
  } catch (error) {
    return null;
  }
}
