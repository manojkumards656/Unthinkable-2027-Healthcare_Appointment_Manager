'use client';

import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/firebase/auth-context';
import { LanguageSwitcher } from './language-switcher';
import { ThemeSwitcher } from './theme-switcher';
import { useTranslations } from 'next-intl';
import { Activity, User, LogOut, Calendar, Stethoscope, Shield } from 'lucide-react';

export function Navbar() {
  const { user, role, signOut, loading } = useAuth();
  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('Auth');
  const tDash = useTranslations('Dashboard');

  const getDashboardHref = () => {
    if (role === 'DOCTOR') return '/dashboard/doctor';
    if (role === 'ADMIN') return '/dashboard/admin';
    return '/dashboard/patient';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border-color))] bg-[hsl(var(--surface-card))]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary-action))] flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-[hsl(var(--text-primary))] tracking-tight">
              {tCommon('appName')}
            </span>
            <span className="hidden sm:block text-[10px] uppercase font-semibold tracking-wider text-[hsl(var(--text-muted))]">
              Trilingual Clinical Hub
            </span>
          </div>
        </Link>

        {/* Center / Portal links */}
        <nav className="hidden md:flex items-center gap-6">
          {user && (
            <>
              <Link
                href={getDashboardHref()}
                className="text-sm font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--primary-action))] transition-colors flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                {tCommon('dashboard')}
              </Link>

              {role === 'PATIENT' && (
                <Link
                  href="/book"
                  className="text-sm font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--primary-action))] transition-colors"
                >
                  {tDash('todayAppointments')}
                </Link>
              )}

              {role === 'DOCTOR' && (
                <Link
                  href="/doctor/leaves"
                  className="text-sm font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--primary-action))] transition-colors flex items-center gap-1.5"
                >
                  <Stethoscope className="w-4 h-4" />
                  {tDash('manageLeave')}
                </Link>
              )}

              {role === 'ADMIN' && (
                <>
                  <Link
                    href="/admin/doctors"
                    className="text-sm font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--primary-action))] transition-colors flex items-center gap-1.5"
                  >
                    <Shield className="w-4 h-4" />
                    {tDash('manageDoctors')}
                  </Link>
                  <Link
                    href="/admin/slots"
                    className="text-sm font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--primary-action))] transition-colors"
                  >
                    {tDash('generateSlots')}
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Controls & Auth */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <ThemeSwitcher />
          <LanguageSwitcher />

          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-xs font-semibold text-[hsl(var(--text-primary))]">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[hsl(var(--primary-action))]/10 text-[hsl(var(--primary-action))]">
                      {role || 'PATIENT'}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    aria-label="Logout"
                    title={tCommon('logout')}
                    className="p-2 rounded-xl border border-[hsl(var(--border-color))] bg-[hsl(var(--surface-card))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--destructive))] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-[hsl(var(--border-color))] text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--border-color))]/50 transition-colors"
                  >
                    {tAuth('loginButton')}
                  </Link>
                  <Link
                    href="/register"
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[hsl(var(--primary-action))] text-white hover:bg-[hsl(var(--primary-action-hover))] transition-colors shadow-xs"
                  >
                    {tAuth('registerButton')}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
