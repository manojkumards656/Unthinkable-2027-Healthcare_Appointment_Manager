import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDummyPlaceholderApiKeyForPreviewMode',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'healthcare-demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'healthcare-demo',
};

let app;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} catch (e) {
  console.warn('Firebase client initialized in fallback mode:', e);
  app = getApps().length > 0 ? getApps()[0] : null;
  auth = app ? getAuth(app) : (null as any);
  googleProvider = new GoogleAuthProvider();
}

export { auth, googleProvider };
