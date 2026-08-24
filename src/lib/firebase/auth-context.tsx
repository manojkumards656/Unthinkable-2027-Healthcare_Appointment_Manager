'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './client';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUser = async (firebaseUser: User | null) => {
    if (firebaseUser) {
      setUser(firebaseUser);
      try {
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const userRole = (tokenResult.claims.role as UserRole) || 'PATIENT';
        setRole(userRole);

        const idToken = await firebaseUser.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      } catch (err) {
        console.error('Failed to sync auth session:', err);
      }
    } else {
      setUser(null);
      setRole(null);
      try {
        await fetch('/api/auth/session', { method: 'DELETE' });
      } catch (err) {}
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        syncUser(firebaseUser);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Auth state subscription skipped:', e);
      setLoading(false);
    }
  }, []);

  const refreshAuth = async () => {
    if (auth && auth.currentUser) {
      await syncUser(auth.currentUser);
    }
  };

  const signOut = async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setUser(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
