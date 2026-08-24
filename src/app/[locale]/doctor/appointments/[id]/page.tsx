'use client';

import { useState, useEffect, use } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Navbar } from '@/components/navbar';
import {
  Calendar,
  Clock,
  User,
  Activity,
  AlertTriangle,
  Stethoscope,
  FileText,
  Pill,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  HelpCircle,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

export default function DoctorAppointmentConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tDoctor = useTranslations('Doctor');
  const tClinical = useTranslations('ClinicalNotes');
  const tRx = useTranslations('Prescriptions');
  const tSymptoms = useTranslations('Symptoms');
  const tCommon = useTranslations('Common');
  const router = useRouter();

  const [appointment, setAppointment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [notes, setNotes] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'ta' | 'hi'>('en');
  const [medications, setMedications] = useState<
    Array<{ name: string; dosage: string; frequency: string; duration: string }>
  >([{ name: '', dosage: '', frequency: 'Once daily after food', duration: '5 days' }]);
  const [reminderFrequency, setReminderFrequency] = useState<'DAILY' | 'TWICE_DAILY' | 'WEEKLY'>('DAILY');
  const [reminderEndDate, setReminderEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  const [submitting, setSubmitting] = useState(false);
  const [generatedDischarge, setGeneratedDischarge] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}`);
      const data = await res.json();
      if (res.ok && data.appointment) {
        setAppointment(data.appointment);
        if (data.appointment.patient?.language) {
          setTargetLanguage(data.appointment.patient.language);
        }
        if (data.appointment.postVisitSummary) {
          setNotes(data.appointment.postVisitSummary.physicianNotes || '');
          setGeneratedDischarge(data.appointment.postVisitSummary.aiDischargeSummary);
        }
      }
    } catch (e) {
      console.error('Failed to load appointment:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: 'Once daily after food', duration: '5 days' }]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: string, value: string) => {
    const updated = [...medications];
    (updated[index] as any)[field] = value;
    setMedications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setSubmitting(true);
    setError('');

    const validMeds = medications.filter((m) => m.name.trim().length > 0);

    try {
      const res = await fetch('/api/doctor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: id,
          notes,
          targetLanguage,
          medications: validMeds.length > 0 ? validMeds : undefined,
          reminderFrequency: validMeds.length > 0 ? reminderFrequency : undefined,
          reminderEndDate: validMeds.length > 0 ? reminderEndDate : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit clinical notes');
      }

      setGeneratedDischarge(data.postVisitSummary?.aiDischargeSummary);
      await fetchAppointment();
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
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
            href="/dashboard/doctor"
            className="text-xs font-bold text-[hsl(var(--primary-action))] hover:underline flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Doctor Portal</span>
          </Link>
        </div>
      </div>
    );
  }

  const triage = appointment.symptomSubmission?.aiTriageSummary;

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/doctor"
            className="text-xs font-bold text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Patient Queue</span>
          </Link>

          <span
            className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full ${
              appointment.status === 'COMPLETED'
                ? 'bg-blue-500/10 text-blue-600'
                : 'bg-emerald-500/10 text-emerald-600'
            }`}
          >
            {appointment.status}
          </span>
        </div>

        {/* Patient Profile & Visit Meta */}
        <div className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[hsl(var(--primary-action))]" />
              <h1 className="text-xl font-extrabold text-[hsl(var(--text-primary))]">
                {appointment.patient?.name || 'Patient'}
              </h1>
            </div>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
              Email: {appointment.patient?.email} | Preferred Language:{' '}
              <strong className="uppercase">{appointment.patient?.language || 'EN'}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-[hsl(var(--text-muted))] bg-[hsl(var(--bg-root))] p-3 rounded-2xl">
            <div>
              <strong>Date:</strong>{' '}
              {new Date(appointment.appointmentTimestamp).toLocaleDateString()}
            </div>
            <div>
              <strong>Time:</strong>{' '}
              {new Date(appointment.appointmentTimestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        {/* AI Pre-Visit EHR Triage Insights */}
        {triage ? (
          <div className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-600">
                <Sparkles className="w-5 h-5" />
                <h2 className="text-base font-extrabold text-[hsl(var(--text-primary))]">
                  AI Pre-Visit Triage & EHR Summary
                </h2>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  triage.urgencyLevel === 'High'
                    ? 'bg-red-600 text-white'
                    : triage.urgencyLevel === 'Medium'
                    ? 'bg-amber-500/20 text-amber-800'
                    : 'bg-emerald-500/20 text-emerald-800'
                }`}
              >
                {triage.urgencyLevel} Urgency
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
              <p className="text-xs text-[hsl(var(--text-primary))] leading-relaxed font-medium">
                {triage.formattedClinicalSummary}
              </p>
              <div className="flex flex-wrap gap-4 text-xs pt-2 text-[hsl(var(--text-muted))] font-semibold">
                <span>Complaint: {triage.chiefComplaint}</span>
                <span>Duration: {triage.symptomDurationDays} days</span>
                <span>Pain: {triage.painScaleOneToTen} / 10</span>
              </div>
            </div>

            {triage.redFlagAlerts?.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
                <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Red Flag Clinical Alerts</span>
                </div>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                  {triage.redFlagAlerts.map((alert: string, idx: number) => (
                    <li key={idx}>{alert}</li>
                  ))}
                </ul>
              </div>
            )}

            {triage.suggestedDoctorQuestions?.length > 0 && (
              <div className="p-4 rounded-2xl bg-[hsl(var(--bg-root))] space-y-2">
                <div className="flex items-center gap-2 text-[hsl(var(--primary-action))] text-xs font-bold">
                  <HelpCircle className="w-4 h-4" />
                  <span>Suggested Diagnostic Questions to Ask Patient</span>
                </div>
                <ul className="list-disc list-inside text-xs text-[hsl(var(--text-primary))] space-y-1">
                  {triage.suggestedDoctorQuestions.map((q: string, idx: number) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-muted))]">
            No pre-visit symptom intake provided by patient.
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Post-Visit Clinical Notes & Prescription Form */}
        <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[hsl(var(--primary-action))]">
              <FileText className="w-5 h-5" />
              <h2 className="text-base font-extrabold text-[hsl(var(--text-primary))]">
                {tClinical('title')}
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="font-semibold text-[hsl(var(--text-muted))]">
                {tClinical('targetLanguage')}:
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-bold text-[hsl(var(--text-primary))]"
              >
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[hsl(var(--text-primary))]">
              {tClinical('physicianNotes')}
            </label>
            <textarea
              rows={6}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tClinical('physicianNotesPlaceholder')}
              className="w-full p-4 rounded-2xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]/60 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
            />
          </div>

          {/* Prescriptions Sub-section */}
          <div className="space-y-4 pt-4 border-t border-[hsl(var(--border-color))]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--text-muted))] flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>{tRx('title')}</span>
              </h3>
              <button
                type="button"
                onClick={handleAddMedication}
                className="text-xs font-bold text-[hsl(var(--primary-action))] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tRx('addMedication')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {medications.map((med, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[hsl(var(--text-muted))]">
                      {tRx('medName')}
                    </label>
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                      placeholder="e.g. Paracetamol"
                      className="w-full px-3 py-1.5 rounded-xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-primary))]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[hsl(var(--text-muted))]">
                      {tRx('dosage')}
                    </label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                      placeholder="e.g. 500mg"
                      className="w-full px-3 py-1.5 rounded-xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-primary))]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[hsl(var(--text-muted))]">
                      {tRx('frequency')}
                    </label>
                    <input
                      type="text"
                      value={med.frequency}
                      onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                      placeholder="Twice daily"
                      className="w-full px-3 py-1.5 rounded-xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-primary))]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-[11px] font-semibold text-[hsl(var(--text-muted))]">
                        {tRx('duration')}
                      </label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                        placeholder="5 days"
                        className="w-full px-3 py-1.5 rounded-xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-primary))]"
                      />
                    </div>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(idx)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[hsl(var(--text-primary))]">
                  {tRx('reminderFrequency')}
                </label>
                <select
                  value={reminderFrequency}
                  onChange={(e) => setReminderFrequency(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-medium text-[hsl(var(--text-primary))]"
                >
                  <option value="DAILY">{tRx('daily')}</option>
                  <option value="TWICE_DAILY">{tRx('twiceDaily')}</option>
                  <option value="WEEKLY">{tRx('weekly')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[hsl(var(--text-primary))]">
                  {tRx('reminderEndDate')}
                </label>
                <input
                  type="date"
                  value={reminderEndDate}
                  onChange={(e) => setReminderEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-medium text-[hsl(var(--text-primary))]"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="accessible-button w-full py-3 rounded-xl bg-[hsl(var(--primary-action))] text-white text-xs font-bold hover:bg-[hsl(var(--primary-action-hover))] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            <span>{submitting ? tClinical('saving') : tClinical('generateDischarge')}</span>
          </button>
        </form>

        {/* Real-time preview of AI Generated Discharge */}
        {generatedDischarge && (
          <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Generated Localized Patient Discharge Summary ({targetLanguage.toUpperCase()})</span>
            </div>
            <p className="text-xs text-[hsl(var(--text-primary))] font-semibold">
              <strong>Simplified Diagnosis:</strong> {generatedDischarge.simplifiedDiagnosis}
            </p>
            {generatedDischarge.homeCareSteps && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-[hsl(var(--text-muted))]">Home Care:</span>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-[hsl(var(--text-primary))]">
                  {generatedDischarge.homeCareSteps.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
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
