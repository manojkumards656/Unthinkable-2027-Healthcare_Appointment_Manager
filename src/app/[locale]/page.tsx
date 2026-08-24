'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  Calendar,
  ShieldCheck,
  Zap,
  Languages,
  Eye,
  Stethoscope,
  HeartPulse,
  ArrowRight,
  Clock,
} from 'lucide-react';

export default function HomePage() {
  const tCommon = useTranslations('Common');
  const tAppt = useTranslations('Appointments');
  const tDash = useTranslations('Dashboard');
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary-action))]/10 border border-[hsl(var(--primary-action))]/20 text-[hsl(var(--primary-action))] text-xs font-semibold uppercase tracking-wider">
            <HeartPulse className="w-4 h-4 animate-pulse" />
            Next-Generation Clinical Appointment Engine
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[hsl(var(--text-primary))] leading-tight">
            High-Performance Healthcare,{' '}
            <span className="text-[hsl(var(--primary-action))]">Trilingual & Accessible</span>
          </h1>

          <p className="text-lg sm:text-xl text-[hsl(var(--text-muted))] max-w-2xl mx-auto leading-relaxed">
            Instant 30-minute slot reservations protected by distributed race-condition locks, AI-powered clinical triage, and automated physician leave management.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/book"
              className="accessible-button inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[hsl(var(--primary-action))] text-white font-bold hover:bg-[hsl(var(--primary-action-hover))] transition-all shadow-lg hover:shadow-xl cursor-pointer"
            >
              <Calendar className="w-5 h-5" />
              <span>{tAppt('bookAppointment')}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            {user ? (
              <Link
                href={
                  role === 'DOCTOR'
                    ? '/dashboard/doctor'
                    : role === 'ADMIN'
                    ? '/dashboard/admin'
                    : '/dashboard/patient'
                }
                className="accessible-button inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-[hsl(var(--border-color))] bg-[hsl(var(--surface-card))] text-[hsl(var(--text-primary))] font-semibold hover:bg-[hsl(var(--border-color))]/40 transition-colors cursor-pointer"
              >
                {tCommon('dashboard')}
              </Link>
            ) : (
              <Link
                href="/register"
                className="accessible-button inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-[hsl(var(--border-color))] bg-[hsl(var(--surface-card))] text-[hsl(var(--text-primary))] font-semibold hover:bg-[hsl(var(--border-color))]/40 transition-colors cursor-pointer"
              >
                {tCommon('register')}
              </Link>
            )}
          </div>
        </div>

        {/* Core Architecture Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[hsl(var(--text-primary))]">
              Zero Double-Booking Guarantee
            </h3>
            <p className="text-sm text-[hsl(var(--text-muted))] leading-relaxed">
              Two-tier concurrency barrier uniting Upstash Redis distributed locks and PostgreSQL row-level locks with partial unique constraints.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[hsl(var(--text-primary))]">
              AI Triage & Localized Discharge
            </h3>
            <p className="text-sm text-[hsl(var(--text-muted))] leading-relaxed">
              Gemini 2.5 Flash ingests symptoms into structured EHR pre-visit summaries and translates physician notes into plain-language discharge guides.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[hsl(var(--text-primary))]">
              Tri-Mode Inclusive Accessibility
            </h3>
            <p className="text-sm text-[hsl(var(--text-muted))] leading-relaxed">
              Native Light, OLED True Black, and Senior Accessibility Mode (10:1+ contrast, 56px touch targets, 20px typography) supporting EN, TA, HI.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[hsl(var(--border-color))] py-6 text-center text-xs text-[hsl(var(--text-muted))] bg-[hsl(var(--surface-card))]">
        <div className="max-w-7xl mx-auto px-4">
          © 2026 {tCommon('appName')}. Enterprise Trilingual Healthcare Appointment Platform.
        </div>
      </footer>
    </div>
  );
}
