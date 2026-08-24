'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navbar } from '@/components/navbar';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Stethoscope,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

function BookingFlowContent() {
  const tAppt = useTranslations('Appointments');
  const tCommon = useTranslations('Common');
  const tSymptoms = useTranslations('Symptoms');
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedDoctorId = searchParams.get('doctorId');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [symptomLang, setSymptomLang] = useState<'en' | 'ta' | 'hi'>('en');

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedApptId, setConfirmedApptId] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await fetch('/api/doctors');
      const data = await res.json();
      if (res.ok) {
        const docList = data.doctors || [];
        setDoctors(docList);
        if (preSelectedDoctorId) {
          const matched = docList.find((d: any) => d.id === preSelectedDoctorId);
          if (matched) {
            handleSelectDoctor(matched);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load doctors:', e);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSelectDoctor = async (doc: any) => {
    setSelectedDoctor(doc);
    setSelectedSlot(null);
    setStep(2);
    setLoadingSlots(true);

    try {
      const res = await fetch(`/api/slots?doctorId=${doc.id}`);
      const data = await res.json();
      if (res.ok) {
        setSlots(data.slots || []);
      }
    } catch (e) {
      console.error('Failed to load slots:', e);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectSlot = (slot: any) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleConfirmAndBook = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!selectedDoctor || !selectedSlot) return;

    setSubmittingBooking(true);
    setBookingError(null);

    try {
      // 1. Create appointment using concurrency engine
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          slotId: selectedSlot.id,
          slotTimestamp: selectedSlot.slotTimestamp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'SLOT_BUSY' || data.error === 'CONFLICT_DOUBLE_BOOKING') {
          setBookingError(tAppt('bookingConflict'));
        } else if (data.error === 'SLOT_UNAVAILABLE') {
          setBookingError(tAppt('slotUnavailable'));
        } else {
          setBookingError(data.error || 'Booking failed');
        }
        return;
      }

      const appointmentId = data.appointment.id;
      setConfirmedApptId(appointmentId);

      // 2. If symptoms provided, submit for AI triage
      if (symptoms.trim().length >= 10) {
        try {
          await fetch('/api/symptoms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appointmentId,
              symptoms,
              language: symptomLang,
            }),
          });
        } catch (symError) {
          console.warn('Symptom intake warning (non-blocking):', symError);
        }
      }

      setStep(4);
    } catch (e) {
      console.error('Booking submission error:', e);
      setBookingError('Network error while processing booking');
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        {/* Progress Tracker */}
        <div className="flex items-center justify-between max-w-2xl mx-auto px-4">
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-[hsl(var(--primary-action))]' : 'text-[hsl(var(--text-muted))]'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center border ${step >= 1 ? 'bg-[hsl(var(--primary-action))] text-white border-[hsl(var(--primary-action))]' : 'border-[hsl(var(--border-color))]'}`}>1</span>
            <span>{tAppt('selectDoctor')}</span>
          </div>
          <div className="h-0.5 w-12 bg-[hsl(var(--border-color))]" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-[hsl(var(--primary-action))]' : 'text-[hsl(var(--text-muted))]'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center border ${step >= 2 ? 'bg-[hsl(var(--primary-action))] text-white border-[hsl(var(--primary-action))]' : 'border-[hsl(var(--border-color))]'}`}>2</span>
            <span>{tAppt('selectSlot')}</span>
          </div>
          <div className="h-0.5 w-12 bg-[hsl(var(--border-color))]" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-[hsl(var(--primary-action))]' : 'text-[hsl(var(--text-muted))]'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center border ${step >= 3 ? 'bg-[hsl(var(--primary-action))] text-white border-[hsl(var(--primary-action))]' : 'border-[hsl(var(--border-color))]'}`}>3</span>
            <span>{tSymptoms('enterSymptoms')}</span>
          </div>
        </div>

        {/* STEP 1: SELECT DOCTOR */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-[hsl(var(--text-primary))]">
                {tAppt('selectDoctor')}
              </h1>
              <p className="text-sm text-[hsl(var(--text-muted))]">
                Choose a certified specialist for your 30-minute consultation
              </p>
            </div>

            {loadingDoctors ? (
              <div className="p-12 text-center text-sm text-[hsl(var(--text-muted))] bg-[hsl(var(--surface-card))] rounded-3xl border border-[hsl(var(--border-color))]">
                {tCommon('loading')}
              </div>
            ) : doctors.length === 0 ? (
              <div className="p-12 text-center text-sm text-[hsl(var(--text-muted))] bg-[hsl(var(--surface-card))] rounded-3xl border border-[hsl(var(--border-color))]">
                No doctors currently available.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoctor(doc)}
                    className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] hover:border-[hsl(var(--primary-action))] cursor-pointer transition-all hover:shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[hsl(var(--text-primary))]">
                          {doc.name}
                        </h3>
                        <p className="text-xs text-[hsl(var(--primary-action))] font-semibold">
                          {doc.specialty}
                        </p>
                      </div>
                      <span className="p-2.5 rounded-2xl bg-[hsl(var(--primary-action))]/10 text-[hsl(var(--primary-action))]">
                        <Stethoscope className="w-5 h-5" />
                      </span>
                    </div>

                    <p className="text-xs text-[hsl(var(--text-muted))]">
                      {doc.qualifications || 'Certified Physician'}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-[hsl(var(--border-color))]">
                      <span className="text-[hsl(var(--text-muted))]">
                        Languages: {doc.languagesSpoken?.join(', ').toUpperCase()}
                      </span>
                      <span className="font-bold text-[hsl(var(--primary-action))] flex items-center gap-1">
                        Select Slots <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SELECT SLOT */}
        {step === 2 && selectedDoctor && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-[hsl(var(--primary-action))] hover:underline mb-1"
                >
                  ← Change Doctor
                </button>
                <h1 className="text-2xl font-bold text-[hsl(var(--text-primary))]">
                  {selectedDoctor.name}
                </h1>
                <p className="text-xs text-[hsl(var(--text-muted))]">
                  {selectedDoctor.specialty} | 30-minute consultation
                </p>
              </div>
            </div>

            {loadingSlots ? (
              <div className="p-12 text-center text-sm text-[hsl(var(--text-muted))] bg-[hsl(var(--surface-card))] rounded-3xl border border-[hsl(var(--border-color))]">
                {tCommon('loading')}
              </div>
            ) : slots.length === 0 ? (
              <div className="p-12 text-center text-sm text-[hsl(var(--text-muted))] bg-[hsl(var(--surface-card))] rounded-3xl border border-[hsl(var(--border-color))] space-y-3">
                <p>No available slots found for Dr. {selectedDoctor.name}.</p>
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl bg-[hsl(var(--primary-action))] text-white text-xs font-bold"
                >
                  Choose Another Doctor
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] space-y-4">
                <h2 className="text-sm font-bold text-[hsl(var(--text-primary))]">
                  {tAppt('selectSlot')}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
                  {slots.map((slot) => {
                    const dateObj = new Date(slot.slotTimestamp);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleSelectSlot(slot)}
                        className="p-3.5 rounded-2xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] hover:border-[hsl(var(--primary-action))] hover:bg-[hsl(var(--primary-action))]/5 text-left transition-all"
                      >
                        <div className="text-xs font-bold text-[hsl(var(--text-primary))]">
                          {dateObj.toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-[hsl(var(--primary-action))] font-semibold mt-1">
                          {dateObj.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: SYMPTOM INTAKE & CONFIRMATION */}
        {step === 3 && selectedDoctor && selectedSlot && (
          <div className="space-y-6">
            <button
              onClick={() => setStep(2)}
              className="text-xs font-bold text-[hsl(var(--primary-action))] hover:underline"
            >
              ← Back to Slots
            </button>

            {/* Summary Banner */}
            <div className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary-action))]">
                Appointment Summary
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[hsl(var(--text-primary))]">
                    Dr. {selectedDoctor.name}
                  </h3>
                  <p className="text-xs text-[hsl(var(--text-muted))]">
                    {selectedDoctor.specialty}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 inline mr-1 text-[hsl(var(--primary-action))]" />
                  {new Date(selectedSlot.slotTimestamp).toLocaleString([], {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </div>
              </div>
            </div>

            {/* Symptom Intake Card */}
            <div className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[hsl(var(--text-primary))] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    {tSymptoms('symptomIntakeTitle')} (Optional)
                  </h3>
                  <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
                    {tSymptoms('symptomIntakeSubtitle')}
                  </p>
                </div>

                <select
                  value={symptomLang}
                  onChange={(e) => setSymptomLang(e.target.value as any)}
                  className="p-2 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-bold text-[hsl(var(--primary-action))]"
                >
                  <option value="en">English</option>
                  <option value="ta">தமிழ்</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>

              <textarea
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder={tSymptoms('symptomPlaceholder')}
                className="w-full p-4 rounded-2xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-action))]"
              />

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  HIPAA Anonymization active: Your identifying details are scrubbed before AI processing.
                </span>
              </div>
            </div>

            {bookingError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <button
              onClick={handleConfirmAndBook}
              disabled={submittingBooking}
              className="w-full py-4 rounded-2xl bg-[hsl(var(--primary-action))] text-white font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {submittingBooking ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Securing 30-Min Lock...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  {tAppt('confirmBooking')}
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === 4 && (
          <div className="max-w-xl mx-auto p-8 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[hsl(var(--text-primary))]">
                {tAppt('bookingSuccess')}
              </h2>
              <p className="text-xs text-[hsl(var(--text-muted))]">
                Confirmation email and Google Calendar notification sent.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs space-y-1 text-left">
              <div><strong>Doctor:</strong> Dr. {selectedDoctor?.name}</div>
              <div><strong>Time:</strong> {selectedSlot && new Date(selectedSlot.slotTimestamp).toLocaleString()}</div>
              <div><strong>Duration:</strong> 30 minutes</div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/patient"
                className="flex-1 py-3 rounded-xl bg-[hsl(var(--primary-action))] text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                Go to My Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="flex-1 py-3 rounded-xl border border-[hsl(var(--border-color))] text-xs font-bold text-[hsl(var(--text-primary))] flex items-center justify-center"
              >
                {tCommon('home')}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BookingFlowContent />
    </Suspense>
  );
}
