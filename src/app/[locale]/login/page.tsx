'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Navbar } from '@/components/navbar';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { Lock, Mail, Activity, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const tAuth = useTranslations('Auth');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await refreshAuth();
      const tokenResult = await cred.user.getIdTokenResult();
      const role = (tokenResult.claims.role as string) || 'PATIENT';

      if (role === 'DOCTOR') router.push('/dashboard/doctor');
      else if (role === 'ADMIN') router.push('/dashboard/admin');
      else router.push('/dashboard/patient');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(tAuth('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await refreshAuth();
      const tokenResult = await result.user.getIdTokenResult();
      const role = (tokenResult.claims.role as string) || 'PATIENT';

      if (role === 'DOCTOR') router.push('/dashboard/doctor');
      else if (role === 'ADMIN') router.push('/dashboard/admin');
      else router.push('/dashboard/patient');
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(tAuth('googleAuthError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] p-6 sm:p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary-action))]/10 text-[hsl(var(--primary-action))] flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--text-primary))]">
              {tAuth('loginTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--text-muted))]">
              {tAuth('loginSubtitle')}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[hsl(var(--text-primary))]">
                {tAuth('email')}
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3.5 text-[hsl(var(--text-muted))]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]/60 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[hsl(var(--text-primary))]">
                {tAuth('password')}
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 text-[hsl(var(--text-muted))]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]/60 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="accessible-button w-full py-3 rounded-xl bg-[hsl(var(--primary-action))] text-white font-bold hover:bg-[hsl(var(--primary-action-hover))] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? tCommon('loading') : tAuth('loginButton')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[hsl(var(--border-color))] w-full" />
            <span className="bg-[hsl(var(--surface-card))] px-3 text-[11px] font-semibold text-[hsl(var(--text-muted))] uppercase">
              Or
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="accessible-button w-full py-2.5 rounded-xl border border-[hsl(var(--border-color))] bg-[hsl(var(--surface-card))] text-[hsl(var(--text-primary))] text-xs font-semibold hover:bg-[hsl(var(--border-color))]/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{tAuth('googleLogin')}</span>
          </button>

          <p className="text-center text-xs text-[hsl(var(--text-muted))]">
            {tAuth('noAccount')}{' '}
            <Link href="/register" className="font-bold text-[hsl(var(--primary-action))] hover:underline">
              {tAuth('registerButton')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
