import { z } from 'zod';

export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  slotId: z.string().uuid(),
  slotTimestamp: z.string().datetime(),
  symptoms: z.string().min(5).max(5000).optional(),
  inputLanguage: z.enum(['en', 'ta', 'hi']).default('en'),
});

export const submitSymptomsSchema = z.object({
  appointmentId: z.string().uuid(),
  symptoms: z.string().min(5).max(5000),
  language: z.enum(['en', 'ta', 'hi']).default('en'),
});

export const submitNotesSchema = z.object({
  appointmentId: z.string().uuid(),
  notes: z.string().min(5).max(10000),
  targetLanguage: z.enum(['en', 'ta', 'hi']).default('en'),
  medications: z.array(z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
  })).optional(),
  reminderFrequency: z.enum(['DAILY', 'TWICE_DAILY', 'WEEKLY']).optional(),
  reminderEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const createDoctorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  specialty: z.string().min(2),
  qualifications: z.string().optional(),
  languagesSpoken: z.array(z.enum(['en', 'ta', 'hi'])).default(['en']),
  workingHours: z.record(
    z.string(),
    z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
  ),
  slotDurationMinutes: z.number().int().min(15).max(120).default(30),
});

export const requestLeaveSchema = z.object({
  doctorId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

export const createPrescriptionSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  medications: z.array(z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
  })).min(1),
  reminderFrequency: z.enum(['DAILY', 'TWICE_DAILY', 'WEEKLY']).default('DAILY'),
  reminderEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const userRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN']).default('PATIENT'),
  phone: z.string().optional(),
  language: z.enum(['en', 'ta', 'hi']).default('en'),
});
