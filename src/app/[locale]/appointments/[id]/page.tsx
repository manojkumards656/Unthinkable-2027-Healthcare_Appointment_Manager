'use client';

import { useState, useEffect, use } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Navbar } from '@/components/navbar';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Activity,
  AlertTriangle,
  FileText,
  Pill,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  CalendarCheck,
  ShieldAlert,
  HelpCircle,
  Home,
} from 'lucide-react';

export default function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tAppt = useTranslations('Appointments');
  const tSymptoms = useTranslations('Symptoms');
  const tClinical = useTranslations('ClinicalNotes');
  const tRx = useTranslations('Prescriptions');
  const tCommon = useTranslations('Common');
  const router = useRouter();

  const [appointment, setAppointment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}`);
      const data = await res.json();
      if (res.ok) {
        setAppointment(data.appointment);
      }
    } catch (e) {
      console.error('Failed to load appointment:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(tAppt('cancelConfirm'))) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL', reason: 'Patient cancelled' }),
      });
      if (res.ok) {
        await fetchAppointment();
      }
    } catch (e) {
      console.error('Failed to cancel appointment:', e);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-xs text-[hsl(var(--text-muted))]">
          {tCommon('loading')}
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <p className="text-sm font-bold text-[hsl(var(--text-muted))]">
            Appointment not found
          </p>
          <Link
            href="/dashboard/patient"
            className="text-xs font-bold text-[hsl(var(--primary-action))] hover:underline flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const apptDate = new Date(appointment.appointmentTimestamp);
  const triage = appointment.symptomSubmission?.aiTriageSummary;
  const discharge = appointment.postVisitSummary?.aiDischargeSummary;
  const rxList = appointment.prescriptions || [];
  const canCancel =
    !['CANCELLED_BY_PATIENT', 'CANCELLED_BY_PROVIDER', 'COMPLETED'].includes(
      appointment.status
    );

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/patient"
            className="text-xs font-bold text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{tCommon('back')}</span>
          </Link>

          <span
            className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full ${
              appointment.status === 'CONFIRMED'
                ? 'bg-emerald-500/10 text-emerald-600'
                : appointment.status === 'COMPLETED'
                ? 'bg-blue-500/10 text-blue-600'
                : appointment.status.includes('CANCELLED')
                ? 'bg-red-500/10 text-red-600'
                : 'bg-yellow-500/10 text-yellow-600'
            }`}
          >
            {appointment.status}
          </span>
        </div>

        {/* Appointment Card */}
        <div className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[hsl(var(--text-primary))]">
                  Dr. {appointment.doctor?.name}
                </h1>
                <p className="text-xs text-[hsl(var(--primary-action))] font-semibold">
                  {appointment.doctor?.specialty}
                </p>
                {appointment.doctor?.qualifications && (
                  <p className="text-[11px] text-[hsl(var(--text-muted))]">
                    {appointment.doctor.qualifications}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canCancel && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="accessible-button px-4 py-2 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-bold transition-colors cursor-pointer"
                >
                  {cancelling ? tCommon('loading') : tAppt('cancelAppointment')}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[hsl(var(--border-color))]">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-muted))]">
              <Calendar className="w-4 h-4 text-[hsl(var(--primary-action))]" />
              <span>
                <strong>{tCommon('date')}:</strong> {apptDate.toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-muted))]">
              <Clock className="w-4 h-4 text-[hsl(var(--primary-action))]" />
              <span>
                <strong>{tCommon('time')}:</strong>{' '}
                {apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (30 mins)
              </span>
            </div>
          </div>
        </div>

        {/* AI Pre-Visit Triage Summary */}
        {triage && (
          <div className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[hsl(var(--primary-action))]">
                <Activity className="w-5 h-5" />
                <h2 className="text-base font-extrabold text-[hsl(var(--text-primary))]">
                  {tSymptoms('aiPreVisitSummary')}
                </h2>
              </div>
              <span
                className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                  triage.urgencyLevel === 'High'
                    ? 'bg-red-600 text-white'
                    : triage.urgencyLevel === 'Medium'
                    ? 'bg-amber-500/20 text-amber-700'
                    : 'bg-emerald-500/20 text-emerald-700'
                }`}
              >
                {triage.urgencyLevel} Urgency
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-[hsl(var(--bg-root))] space-y-1">
                <span className="text-[11px] font-semibold text-[hsl(var(--text-muted))] uppercase">
                  {tSymptoms('chiefComplaint')}
                </span>
                <p className="text-xs font-bold text-[hsl(var(--text-primary))]">
                  {triage.chiefComplaint}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[hsl(var(--bg-root))] space-y-1">
                <span className="text-[11px] font-semibold text-[hsl(var(--text-muted))] uppercase">
                  {tSymptoms('duration')}
                </span>
                <p className="text-xs font-bold text-[hsl(var(--text-primary))]">
                  {triage.symptomDurationDays} days
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[hsl(var(--bg-root))] space-y-1">
                <span className="text-[11px] font-semibold text-[hsl(var(--text-muted))] uppercase">
                  {tSymptoms('painLevel')}
                </span>
                <p className="text-xs font-bold text-[hsl(var(--text-primary))]">
                  {triage.painScaleOneToTen} / 10
                </p>
              </div>
            </div>

            {triage.redFlagAlerts && triage.redFlagAlerts.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
                <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{tSymptoms('redFlags')}</span>
                </div>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                  {triage.redFlagAlerts.map((alert: string, idx: number) => (
                    <li key={idx}>{alert}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* AI Post-Visit Discharge Summary */}
        {discharge && (
          <div className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-5">
            <div className="flex items-center gap-2 text-emerald-600">
              <FileText className="w-5 h-5" />
              <h2 className="text-base font-extrabold text-[hsl(var(--text-primary))]">
                {tClinical('dischargeSummary')}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="text-xs font-bold uppercase text-emerald-800">
                {tClinical('simplifiedDiagnosis')}
              </span>
              <p className="text-sm font-bold text-emerald-950">
                {discharge.simplifiedDiagnosis}
              </p>
            </div>

            {discharge.medicationInstructions && discharge.medicationInstructions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--text-muted))] flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  <span>{tClinical('medicationInstructions')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {discharge.medicationInstructions.map((med: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[hsl(var(--bg-root))] space-y-1 border border-[hsl(var(--border-color))]">
                      <p className="text-xs font-extrabold text-[hsl(var(--text-primary))]">
                        {med.medicationName}
                      </p>
                      <p className="text-[11px] text-[hsl(var(--text-muted))]">{med.purpose}</p>
                      <p className="text-xs font-bold text-[hsl(var(--primary-action))]">{med.timingAndDosage}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {discharge.homeCareSteps && discharge.homeCareSteps.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--text-muted))] flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-blue-600" />
                  <span>{tClinical('homeCare')}</span>
                </h3>
                <ul className="list-disc list-inside text-xs text-[hsl(var(--text-primary))] space-y-1 bg-[hsl(var(--bg-root))] p-4 rounded-2xl">
                  {discharge.homeCareSteps.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            {discharge.warningSignsToReturn && discharge.warningSignsToReturn.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{tClinical('warningSigns')}</span>
                </div>
                <ul className="list-disc list-inside text-xs text-amber-900 space-y-1">
                  {discharge.warningSignsToReturn.map((sign: string, idx: number) => (
                    <li key={idx}>{sign}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
