'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  Shield,
  Users,
  Stethoscope,
  Calendar,
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

export default function AdminDashboard() {
  const tAdmin = useTranslations('Admin');
  const tDash = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const { user } = useAuth();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docRes, leaveRes] = await Promise.all([
        fetch('/api/doctors'),
        fetch('/api/doctor/leaves'),
      ]);
      const [docData, leaveData] = await Promise.all([
        docRes.json(),
        leaveRes.json(),
      ]);

      if (docRes.ok) setDoctors(docData.doctors || []);
      if (leaveRes.ok) setLeaves(leaveData.leaves || []);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAction = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(leaveId);
    try {
      const res = await fetch('/api/doctor/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveId, status }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Failed to update leave:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Admin Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                {tDash('adminDashboard')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--text-primary))]">
                {tAdmin('title')}
              </h1>
              <p className="text-xs sm:text-sm text-[hsl(var(--text-muted))]">
                Staff management, leave saga orchestration, and bulk schedule generators
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/doctors"
              className="accessible-button px-4 py-2.5 rounded-xl border border-[hsl(var(--border-color))] bg-[hsl(var(--surface-card))] text-xs font-bold text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--border-color))]/40 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 text-blue-500" />
              <span>{tDash('manageDoctors')}</span>
            </Link>

            <Link
              href="/admin/slots"
              className="accessible-button px-4 py-2.5 rounded-xl bg-[hsl(var(--primary-action))] text-white text-xs font-bold hover:bg-[hsl(var(--primary-action-hover))] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Calendar className="w-4 h-4" />
              <span>{tDash('generateSlots')}</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase text-[hsl(var(--text-muted))]">
              Active Doctors
            </span>
            <p className="text-2xl font-extrabold text-blue-600">
              {doctors.filter((d) => d.isActive).length}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase text-[hsl(var(--text-muted))]">
              Pending Leave Approvals
            </span>
            <p className="text-2xl font-extrabold text-amber-600">
              {pendingLeaves.length}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase text-[hsl(var(--text-muted))]">
              System Health
            </span>
            <p className="text-2xl font-extrabold text-emerald-600">
              Operational
            </p>
          </div>
        </div>

        {/* Pending Leave Requests Section (Triggers Inngest Saga on Approval) */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-[hsl(var(--text-primary))] flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-500" />
            <span>{tAdmin('leaveApprovals')}</span>
          </h2>

          {loading ? (
            <div className="text-center py-8 text-xs text-[hsl(var(--text-muted))]">
              {tCommon('loading')}
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-muted))] text-center">
              No pending doctor leave requests.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="p-5 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[hsl(var(--text-primary))]">
                        Dr. {leave.doctor?.name || 'Doctor'}
                      </h3>
                      <p className="text-xs text-[hsl(var(--primary-action))] font-medium">
                        {leave.doctor?.specialty}
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">
                      PENDING
                    </span>
                  </div>

                  <div className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(var(--bg-root))] p-3 rounded-xl space-y-1">
                    <p>
                      <strong>Dates:</strong> {leave.startDate} to {leave.endDate}
                    </p>
                    {leave.reason && (
                      <p>
                        <strong>Reason:</strong> {leave.reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleLeaveAction(leave.id, 'REJECTED')}
                      disabled={actionLoading === leave.id}
                      className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {tAdmin('reject')}
                    </button>
                    <button
                      onClick={() => handleLeaveAction(leave.id, 'APPROVED')}
                      disabled={actionLoading === leave.id}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      {actionLoading === leave.id ? tCommon('loading') : tAdmin('approve')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
