'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Navbar } from '@/components/navbar';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import { Lock, Mail, User, Phone, Activity, AlertCircle, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const tAuth = useTranslations('Auth');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'PATIENT' | 'DOCTOR' | 'ADMIN'>('PATIENT');
  const [language, setLanguage] = useState<'en' | 'ta' | 'hi'>((locale as any) || 'en');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // 1. Create user in Firebase + PostgreSQL via backend API
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone: phone || undefined,
          language,
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: `Server returned status ${res.status} (${res.statusText})` };
      }

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // 2. Sign in with Firebase Client SDK if auth is active
      if (auth) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          await refreshAuth();
        } catch (signInErr) {
          console.warn('Auto sign-in warning:', signInErr);
        }
      }

      // 3. Redirect to dashboard
      if (role === 'DOCTOR') router.push('/dashboard/doctor');
      else if (role === 'ADMIN') router.push('/dashboard/admin');
      else router.push('/dashboard/patient');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] p-6 sm:p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--primary-action))]/10 text-[hsl(var(--primary-action))] flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--text-primary))]">
              {tAuth('registerTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--text-muted))]">
              {tAuth('registerSubtitle')}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[hsl(var(--text-primary))]">
                {tAuth('name')}
              </label>
              <div className="relative mt-1">
                <User className="w-4 h-4 text-[hsl(var(--text-muted))] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAuth('email')}
                </label>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 text-[hsl(var(--text-muted))] absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAuth('phone')}
                </label>
                <div className="relative mt-1">
                  <Phone className="w-4 h-4 text-[hsl(var(--text-muted))] absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAuth('password')}
                </label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 text-[hsl(var(--text-muted))] absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAuth('confirmPassword')}
                </label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 text-[hsl(var(--text-muted))] absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAuth('role')}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
                >
                  <option value="PATIENT">{tAuth('rolePatient')}</option>
                  <option value="DOCTOR">{tAuth('roleDoctor')}</option>
                  <option value="ADMIN">{tAuth('roleAdmin')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAuth('preferredLanguage')}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
                >
                  <option value="en">English</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[hsl(var(--primary-action))] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              {loading ? (
                tCommon('loading')
              ) : (
                <>
                  <span>{tAuth('registerButton')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[hsl(var(--border-color))]">
            <p className="text-xs text-[hsl(var(--text-muted))]">
              {tAuth('hasAccount')}{' '}
              <Link
                href="/login"
                className="font-bold text-[hsl(var(--primary-action))] hover:underline"
              >
                {tAuth('loginButton')}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
