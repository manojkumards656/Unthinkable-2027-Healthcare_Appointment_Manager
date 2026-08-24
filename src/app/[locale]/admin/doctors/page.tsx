'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Navbar } from '@/components/navbar';
import {
  Stethoscope,
  User,
  Mail,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Globe,
  Clock,
} from 'lucide-react';

export default function AdminDoctorsPage() {
  const tAdmin = useTranslations('Admin');
  const tCommon = useTranslations('Common');

  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Doctor Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [qualifications, setQualifications] = useState('MBBS, MD');
  const [languages, setLanguages] = useState<string[]>(['en', 'ta']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doctors');
      const data = await res.json();
      if (res.ok) {
        setDoctors(data.doctors || []);
      }
    } catch (e) {
      console.error('Failed to fetch doctors:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLang = (lang: string) => {
    if (languages.includes(lang)) {
      if (languages.length > 1) {
        setLanguages(languages.filter((l) => l !== lang));
      }
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          specialty,
          qualifications,
          languagesSpoken: languages,
          workingHours: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' },
          },
          slotDurationMinutes: 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create doctor');
      }

      setSuccess('Doctor profile created successfully.');
      setName('');
      setEmail('');
      setShowAddForm(false);
      await fetchDoctors();
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--bg-root))]">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/dashboard/admin"
            className="text-xs font-bold text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Admin Dashboard</span>
          </Link>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="accessible-button px-4 py-2.5 rounded-xl bg-[hsl(var(--primary-action))] text-white text-xs font-bold hover:bg-[hsl(var(--primary-action-hover))] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Close Form' : tAdmin('addDoctor')}</span>
          </button>
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

        {/* Add Doctor Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddDoctor}
            className="p-6 rounded-3xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-4"
          >
            <h2 className="text-lg font-extrabold text-[hsl(var(--text-primary))]">
              {tAdmin('addDoctor')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAdmin('doctorName')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Anand Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-medium text-[hsl(var(--text-primary))]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAdmin('doctorEmail')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-medium text-[hsl(var(--text-primary))]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAdmin('doctorSpecialty')}
                </label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Cardiology, General Medicine, Pediatrics..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-medium text-[hsl(var(--text-primary))]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[hsl(var(--text-primary))]">
                  {tAdmin('doctorQualifications')}
                </label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="MBBS, MD (General Medicine)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[hsl(var(--bg-root))] border border-[hsl(var(--border-color))] text-xs font-medium text-[hsl(var(--text-primary))]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[hsl(var(--text-primary))]">
                {tAdmin('doctorLanguages')}
              </label>
              <div className="flex gap-4">
                {['en', 'ta', 'hi'].map((l) => (
                  <label key={l} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={languages.includes(l)}
                      onChange={() => handleToggleLang(l)}
                    />
                    <span className="uppercase">{l}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="accessible-button w-full py-2.5 rounded-xl bg-[hsl(var(--primary-action))] text-white text-xs font-bold hover:bg-[hsl(var(--primary-action-hover))] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting ? tCommon('loading') : 'Save Doctor Profile'}
            </button>
          </form>
        )}

        {/* Doctors Directory Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-[hsl(var(--text-primary))]">
            Active Physician Directory
          </h2>

          {loading ? (
            <div className="text-center py-8 text-xs text-[hsl(var(--text-muted))]">
              {tCommon('loading')}
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-8 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] text-xs text-[hsl(var(--text-muted))]">
              No doctors found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[hsl(var(--text-primary))]">
                        Dr. {doc.name}
                      </h3>
                      <p className="text-xs text-[hsl(var(--primary-action))] font-semibold">
                        {doc.specialty}
                      </p>
                      {doc.qualifications && (
                        <p className="text-[11px] text-[hsl(var(--text-muted))]">
                          {doc.qualifications}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-[hsl(var(--text-muted))] space-y-1 bg-[hsl(var(--bg-root))] p-3 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Languages: {(doc.languagesSpoken || ['en']).join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Slot: {doc.slotDurationMinutes} min</span>
                    </div>
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
