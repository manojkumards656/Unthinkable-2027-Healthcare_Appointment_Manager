'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Navbar } from '@/components/navbar';
import { Link, useRouter } from '@/i18n/routing';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

function RescheduleContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const tRes = useTranslations('Reschedule');
  const tAppt = useTranslations('Appointments');
  const tCommon = useTranslations('Common');
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [tokenData, setTokenData] = useState<{
    patientId: string;
    doctorId: string;
    originalAppointmentId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [doctor, setDoctor] = useState<any | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(tRes('invalidToken'));
      setValidating(false);
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/reschedule/validate?token=${token}`);
      const data = await res.json();

      if (res.ok && data.valid) {
        setTokenData(data.payload);
        fetchDoctorAndSlots(data.payload.doctorId);
      } else {
        setError(data.error || tRes('invalidToken'));
      }
    } catch (e) {
      console.error('Validation error:', e);
      setError(tRes('invalidToken'));
    } finally {
      setValidating(false);
    }
  };

  const fetchDoctorAndSlots = async (doctorId: string) => {
    try {
      const [docRes, slotRes] = await Promise.all([
        fetch(`/api/doctors/${doctorId}`),
        fetch(`/api/slots?doctorId=${doctorId}`),
      ]);

      const docData = await docRes.json();
      const slotData = await slotRes.json();

      if (docRes.ok) setDoctor(docData.doctor);
      if (slotRes.ok) setSlots(slotData.slots || []);
    } catch (e) {
      console.error('Error loading doctor/slots:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot || !tokenData) return;
    setBooking(true);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: tokenData.doctorId,
          slotId: selectedSlot.id,
          slotTimestamp: selectedSlot.slotTimestamp,
          rescheduleToken: token,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookingSuccess(true);
      } else {
        alert(data.error || 'Failed to book slot');
      }
    } catch (e) {
      console.error('Reschedule booking error:', e);
      alert('Network error while booking appointment');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full space-y-8">
        {/* Header card */}
        <div className="p-8 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-[hsl(var(--primary-action))] mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-primary))]">
            {tRes('title')}
          </h1>
          <p className="text-sm text-[hsl(var(--text-muted))] max-w-lg mx-auto">
            {tRes('subtitle')}
          </p>
        </div>

        {validating || loading ? (
          <div className="p-12 text-center text-sm text-[hsl(var(--text-muted))] bg-[hsl(var(--surface-card))] rounded-3xl border border-[hsl(var(--border-color))]">
            {tCommon('loading')}
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-3xl">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-red-700 dark:text-red-400">
              {error}
            </h2>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl bg-[hsl(var(--primary-action))] text-white font-bold text-xs"
            >
              {tCommon('home')}
            </Link>
          </div>
        ) : bookingSuccess ? (
          <div className="p-8 text-center space-y-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {tRes('rescheduleSuccess')}
            </h2>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              A confirmation email has been dispatched with your updated appointment schedule.
            </p>
            <div className="pt-4">
              <Link
                href="/dashboard/patient"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--primary-action))] text-white font-bold text-sm"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] space-y-6">
            {doctor && (
              <div className="p-4 rounded-2xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-[hsl(var(--text-primary))]">
                    {doctor.name}
                  </h3>
                  <p className="text-xs text-[hsl(var(--primary-action))] font-semibold">
                    {doctor.specialty} — {doctor.qualifications}
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-500/10 text-[hsl(var(--primary-action))] rounded-full text-xs font-bold">
                  Priority Token Active
                </span>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--text-primary))] mb-3">
                {tRes('selectNewSlot')}
              </h3>

              {slots.length === 0 ? (
                <p className="text-xs text-[hsl(var(--text-muted))] italic">
                  No open slots found. Please check back later.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const dateObj = new Date(slot.slotTimestamp);

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[hsl(var(--primary-action))] text-white border-[hsl(var(--primary-action))] shadow-md'
                            : 'bg-[hsl(var(--bg-root))] border-[hsl(var(--border-color))] hover:border-[hsl(var(--primary-action))] text-[hsl(var(--text-primary))]'
                        }`}
                      >
                        <div className="text-xs font-bold">
                          {dateObj.toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-[hsl(var(--text-muted))]'}`}>
                          {dateObj.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={handleConfirmReschedule}
              disabled={!selectedSlot || booking}
              className="w-full py-3.5 rounded-xl bg-[hsl(var(--primary-action))] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {booking ? tCommon('loading') : tAppt('confirmBooking')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReschedulePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RescheduleContent />
    </Suspense>
  );
}
