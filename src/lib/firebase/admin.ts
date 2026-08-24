import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;

if (!getApps().length) {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'healthcare-demo-platform';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (privateKey) {
    // Handle escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    // Remove enclosing double/single quotes if user accidentally included them
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
  }

  let initialized = false;

  if (clientEmail && privateKey) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      initialized = true;
    } catch (certError) {
      console.warn('Firebase Admin cert initialization failed, falling back:', certError);
    }
  }

  if (!initialized) {
    try {
      adminApp = initializeApp({ projectId });
    } catch (fallbackError) {
      adminApp = getApps().length > 0 ? getApps()[0] : null;
    }
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth: Auth = adminApp ? getAuth(adminApp) : (null as any);

// Helper: Set custom claims for role-based access
export async function setUserRole(uid: string, role: 'PATIENT' | 'DOCTOR' | 'ADMIN') {
  if (adminAuth) {
    await adminAuth.setCustomUserClaims(uid, { role });
  }
}
