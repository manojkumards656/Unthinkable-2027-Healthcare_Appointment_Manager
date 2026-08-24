'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Navbar } from '@/components/navbar';
import {
  CalendarDays,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Send,
} from 'lucide-react';

export default function DoctorLeavesPage() {
  const tDoctor = useTranslations('Doctor');
  const tCommon = useTranslations('Common');

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doctor/leaves');
      const data = await res.json();
      if (res.ok) {
        setLeaves(data.leaves || []);
      }
    } catch (e) {
      console.error('Failed to load leaves:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/doctor/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit leave request');
      }

      setSuccess('Leave request submitted successfully.');
      setReason('');
      await fetchLeaves();
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/doctor"
            className="text-xs font-bold text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

        {/* Leave Request Form */}
        <div className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[hsl(var(--text-primary))]">
                {tDoctor('leaveRequest')}
              </h1>
              <p className="text-xs text-[hsl(var(--text-muted))]">
                Submitting approved leave triggers automated patient rescheduling via Inngest sagas
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tDoctor('startDate')}
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-medium text-[hsl(var(--text-primary))]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tDoctor('endDate')}
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-medium text-[hsl(var(--text-primary))]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[hsl(var(--text-primary))]">
                {tDoctor('leaveReason')}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Medical conference, annual leave, emergency absence..."
                className="w-full p-4 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]/60"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="accessible-button w-full py-2.5 rounded-xl bg-[hsl(var(--primary-action))] text-white text-xs font-bold hover:bg-[hsl(var(--primary-action-hover))] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? tCommon('loading') : tDoctor('submitLeave')}</span>
            </button>
          </form>
        </div>

        {/* Leave History List */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-[hsl(var(--text-primary))]">
            Leave Request History
          </h2>

          {loading ? (
            <div className="text-center py-8 text-xs text-[hsl(var(--text-muted))]">
              {tCommon('loading')}
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-muted))]">
              No leave requests submitted.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {leaves.map((l) => (
                <div
                  key={l.id}
                  className="p-4 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        l.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : l.status === 'REJECTED'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-amber-500/10 text-amber-700'
                      }`}
                    >
                      {l.status}
                    </span>
                    <span className="text-[11px] text-[hsl(var(--text-muted))]">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-[hsl(var(--text-primary))]">
                    {l.startDate} to {l.endDate}
                  </div>

                  {l.reason && (
                    <p className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(var(--bg-root))] p-2.5 rounded-xl">
                      {l.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
