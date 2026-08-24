'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Activity,
  AlertTriangle,
  FileText,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Pill,
} from 'lucide-react';

export default function PatientDashboard() {
  const tDash = useTranslations('Dashboard');
  const tAppt = useTranslations('Appointments');
  const tCommon = useTranslations('Common');
  const tRx = useTranslations('Prescriptions');
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [calendarConnecting, setCalendarConnecting] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (res.ok) {
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error('Failed to load appointments:', e);
    } finally {
      setLoading(false);
    }
  };

  const connectCalendar = async () => {
    setCalendarConnecting(true);
    try {
      const res = await fetch('/api/auth/google-calendar/url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Failed to get calendar URL:', e);
    } finally {
      setCalendarConnecting(false);
    }
  };

  const now = new Date();

  const upcomingList = appointments.filter(
    (a) =>
      new Date(a.appointmentTimestamp) >= now &&
      !['CANCELLED_BY_PATIENT', 'CANCELLED_BY_PROVIDER', 'COMPLETED'].includes(a.status)
  );

  const pastList = appointments.filter(
    (a) =>
      new Date(a.appointmentTimestamp) < now || a.status === 'COMPLETED'
  );

  const cancelledList = appointments.filter(
    (a) => ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_PROVIDER'].includes(a.status)
  );

  const currentDisplayList =
    activeTab === 'upcoming'
      ? upcomingList
      : activeTab === 'past'
      ? pastList
      : cancelledList;

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary-action))]">
              {tDash('patientDashboard')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--text-primary))]">
              Welcome, {user?.displayName || user?.email?.split('@')[0] || 'Patient'}
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--text-muted))]">
              Manage your consultations, AI triage summaries, and prescriptions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={connectCalendar}
              disabled={calendarConnecting}
              className="accessible-button px-4 py-2.5 rounded-xl border border-[hsl(var(--border-color))] bg-[hsl(var(--surface-card))] text-xs font-semibold text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--border-color))]/40 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4 text-blue-500" />
              <span>{tAppt('syncCalendar')}</span>
            </button>

            <Link
              href="/book"
              className="accessible-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--primary-action))] text-white text-xs font-bold hover:bg-[hsl(var(--primary-action-hover))] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{tAppt('bookAppointment')}</span>
            </Link>
          </div>
        </div>

        {/* Tabs & Appointments */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border-color))] pb-2">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-[hsl(var(--primary-action))] text-white shadow-xs'
                  : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]'
              }`}
            >
              {tAppt('upcoming')} ({upcomingList.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'past'
                  ? 'bg-[hsl(var(--primary-action))] text-white shadow-xs'
                  : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]'
              }`}
            >
              {tAppt('past')} ({pastList.length})
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'cancelled'
                  ? 'bg-[hsl(var(--primary-action))] text-white shadow-xs'
                  : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]'
              }`}
            >
              {tAppt('cancelled')} ({cancelledList.length})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-[hsl(var(--text-muted))]">
              {tCommon('loading')}
            </div>
          ) : currentDisplayList.length === 0 ? (
            <div className="text-center py-16 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] space-y-3">
              <Calendar className="w-8 h-8 text-[hsl(var(--text-muted))] mx-auto" />
              <p className="text-sm font-medium text-[hsl(var(--text-muted))]">
                {tAppt('noAppointments')}
              </p>
              {activeTab === 'upcoming' && (
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary-action))] hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  {tAppt('bookAppointment')}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentDisplayList.map((appt) => {
                const apptDate = new Date(appt.appointmentTimestamp);
                const hasSymptomSummary = appt.symptomSubmission?.aiTriageSummary;
                const hasDischargeSummary = appt.postVisitSummary?.aiDischargeSummary;

                return (
                  <div
                    key={appt.id}
                    className="p-5 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs flex flex-col justify-between space-y-4 hover:border-[hsl(var(--primary-action))]/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            appt.status === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : appt.status === 'COMPLETED'
                              ? 'bg-blue-500/10 text-blue-600'
                              : appt.status.includes('CANCELLED')
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-yellow-500/10 text-yellow-600'
                          }`}
                        >
                          {appt.status}
                        </span>

                        {appt.symptomSubmission?.urgencyLevel && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              appt.symptomSubmission.urgencyLevel === 'HIGH'
                                ? 'bg-red-600 text-white animate-pulse'
                                : appt.symptomSubmission.urgencyLevel === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-700'
                                : 'bg-emerald-500/20 text-emerald-700'
                            }`}
                          >
                            {appt.symptomSubmission.urgencyLevel} Urgency
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-[hsl(var(--text-primary))]">
                          Dr. {appt.doctor?.name || 'Practitioner'}
                        </h3>
                        <p className="text-xs text-[hsl(var(--text-muted))]">
                          {appt.doctor?.specialty || 'General Consultation'}
                        </p>
                      </div>

                      <div className="space-y-1 text-xs text-[hsl(var(--text-muted))] bg-[hsl(var(--bg-root))] p-3 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[hsl(var(--primary-action))]" />
                          <span>{apptDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[hsl(var(--primary-action))]" />
                          <span>
                            {apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {hasSymptomSummary && (
                        <div className="text-xs p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 space-y-1">
                          <div className="font-bold flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            <span>Chief Complaint</span>
                          </div>
                          <p className="line-clamp-2 text-[11px]">
                            {appt.symptomSubmission.aiTriageSummary.chiefComplaint}
                          </p>
                        </div>
                      )}

                      {hasDischargeSummary && (
                        <div className="text-xs p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 space-y-1">
                          <div className="font-bold flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>Discharge Available</span>
                          </div>
                          <p className="line-clamp-2 text-[11px]">
                            {appt.postVisitSummary.aiDischargeSummary.simplifiedDiagnosis}
                          </p>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/appointments/${appt.id}`}
                      className="accessible-button w-full py-2.5 rounded-xl border border-[hsl(var(--border-color))] bg-[hsl(var(--surface-card))] text-xs font-bold text-center text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--primary-action))] hover:text-white transition-colors cursor-pointer block"
                    >
                      {tCommon('view')} {tAppt('appointmentDetails')}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
