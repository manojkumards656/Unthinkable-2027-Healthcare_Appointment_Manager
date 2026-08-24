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
  Activity,
  AlertTriangle,
  Stethoscope,
  FileText,
  CheckCircle2,
  CalendarDays,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export default function DoctorDashboard() {
  const tDash = useTranslations('Dashboard');
  const tDoctor = useTranslations('Doctor');
  const tCommon = useTranslations('Common');
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const todayStr = new Date().toDateString();
  const todayAppointments = appointments.filter(
    (a) => new Date(a.appointmentTimestamp).toDateString() === todayStr
  );

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Doctor Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary-action))]">
                {tDash('doctorDashboard')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--text-primary))]">
                Dr. {user?.displayName || user?.email?.split('@')[0]}
              </h1>
              <p className="text-xs sm:text-sm text-[hsl(var(--text-muted))]">
                Patient consultations and AI-assisted clinical documentation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/doctor/leaves"
              className="accessible-button px-4 py-2.5 rounded-xl border border-[hsl(var(--border-color))] bg-[hsl(var(--surface-card))] text-xs font-bold text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--border-color))]/40 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CalendarDays className="w-4 h-4 text-amber-500" />
              <span>{tDoctor('leaveRequest')}</span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase text-[hsl(var(--text-muted))]">
              {tDash('todayAppointments')}
            </span>
            <p className="text-2xl font-extrabold text-[hsl(var(--primary-action))]">
              {todayAppointments.length}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase text-[hsl(var(--text-muted))]">
              {tDash('upcomingConsultations')}
            </span>
            <p className="text-2xl font-extrabold text-purple-600">
              {appointments.filter((a) => a.status === 'CONFIRMED').length}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase text-[hsl(var(--text-muted))]">
              Completed Visits
            </span>
            <p className="text-2xl font-extrabold text-emerald-600">
              {appointments.filter((a) => a.status === 'COMPLETED').length}
            </p>
          </div>
        </div>

        {/* Appointments Queue Table / Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-[hsl(var(--text-primary))]">
            Patient Consultation Queue
          </h2>

          {loading ? (
            <div className="text-center py-12 text-xs text-[hsl(var(--text-muted))]">
              {tCommon('loading')}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12 bg-[hsl(var(--surface-card))] rounded-3xl border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-muted))]">
              No appointments scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => {
                const apptDate = new Date(appt.appointmentTimestamp);
                const triage = appt.symptomSubmission?.aiTriageSummary;
                const urgency = appt.symptomSubmission?.urgencyLevel;

                return (
                  <div
                    key={appt.id}
                    className="p-5 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[hsl(var(--primary-action))]/40 transition-colors"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
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

                        {urgency && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              urgency === 'HIGH'
                                ? 'bg-red-600 text-white animate-pulse'
                                : urgency === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-800'
                                : 'bg-emerald-500/20 text-emerald-800'
                            }`}
                          >
                            {urgency} Urgency
                          </span>
                        )}

                        <span className="text-xs font-semibold text-[hsl(var(--text-muted))] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {apptDate.toLocaleDateString()} at{' '}
                          {apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[hsl(var(--primary-action))]" />
                        <h3 className="font-bold text-base text-[hsl(var(--text-primary))]">
                          {appt.patient?.name || 'Patient'}
                        </h3>
                        <span className="text-xs text-[hsl(var(--text-muted))]">
                          ({appt.patient?.email})
                        </span>
                      </div>

                      {triage && (
                        <div className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(var(--bg-root))] p-3 rounded-2xl space-y-1">
                          <p>
                            <strong className="text-[hsl(var(--text-primary))]">Chief Complaint:</strong>{' '}
                            {triage.chiefComplaint} (Pain: {triage.painScaleOneToTen}/10)
                          </p>
                          {triage.redFlagAlerts?.length > 0 && (
                            <p className="text-red-600 font-bold flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Red Flags: {triage.redFlagAlerts.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/doctor/appointments/${appt.id}`}
                        className="accessible-button px-5 py-2.5 rounded-xl bg-[hsl(var(--primary-action))] text-white text-xs font-bold hover:bg-[hsl(var(--primary-action-hover))] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{appt.status === 'COMPLETED' ? 'View Notes' : 'Open Consultation'}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </div>
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
