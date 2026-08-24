import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("user_role", ["PATIENT", "DOCTOR", "ADMIN"]);

export const languageEnum = pgEnum("language", ["en", "ta", "hi"]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const slotStatusEnum = pgEnum("slot_status", [
  "AVAILABLE",
  "RESERVED",
  "BOOKED",
  "UNAVAILABLE",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "PENDING",
  "CONFIRMED",
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_PROVIDER",
  "COMPLETED",
]);

export const urgencyEnum = pgEnum("urgency_level", ["LOW", "MEDIUM", "HIGH"]);

// ============================================================================
// TABLE 1: users
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firebaseUid: text("firebase_uid").notNull().unique(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    role: userRoleEnum("role").notNull(),
    phone: text("phone"),
    language: languageEnum("language").notNull().default("en"),
    googleCalendarRefreshToken: text("google_calendar_refresh_token"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_users_firebase_uid").on(table.firebaseUid),
    index("idx_users_email").on(table.email),
  ]
);

// ============================================================================
// TABLE 2: doctors
// ============================================================================

export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    specialty: text("specialty").notNull(),
    qualifications: text("qualifications"),
    languagesSpoken: jsonb("languages_spoken")
      .notNull()
      .default(sql`'["en"]'::jsonb`),
    workingHours: jsonb("working_hours").notNull(),
    slotDurationMinutes: integer("slot_duration_minutes").notNull().default(30),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [index("idx_doctors_specialty").on(table.specialty)]
);

// ============================================================================
// TABLE 3: doctor_leaves
// ============================================================================

export const doctorLeaves = pgTable(
  "doctor_leaves",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason"),
    status: leaveStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_doctor_leaves_doctor_id").on(table.doctorId)]
);

// ============================================================================
// TABLE 4: slots
// ============================================================================

export const slots = pgTable(
  "slots",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    slotTimestamp: timestamp("slot_timestamp", { withTimezone: true }).notNull(),
    endTimestamp: timestamp("end_timestamp", { withTimezone: true }).notNull(),
    status: slotStatusEnum("status").notNull().default("AVAILABLE"),
  },
  (table) => [
    // Prevent duplicate slot generation for same doctor+time
    uniqueIndex("idx_slots_doctor_timestamp").on(
      table.doctorId,
      table.slotTimestamp
    ),
    index("idx_slots_doctor_status").on(table.doctorId, table.status),
  ]
);

// ============================================================================
// TABLE 5: appointments
// ============================================================================

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => slots.id, { onDelete: "cascade" }),
    appointmentTimestamp: timestamp("appointment_timestamp", {
      withTimezone: true,
    }).notNull(),
    status: appointmentStatusEnum("status").notNull().default("PENDING"),
    cancellationReason: text("cancellation_reason"),
    googleCalendarEventId: text("google_calendar_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // ⚠️ CRITICAL: Partial unique index — the absolute double-booking safety net.
    // Even if Redis locks fail and row locks are bypassed, this index guarantees
    // that no two active appointments share the same doctor + timestamp.
    uniqueIndex("idx_prevent_double_booking")
      .on(table.doctorId, table.appointmentTimestamp)
      .where(
        sql`status IN ('PENDING', 'CONFIRMED')`
      ),
    index("idx_appointments_patient").on(table.patientId),
    index("idx_appointments_doctor_time").on(
      table.doctorId,
      table.appointmentTimestamp
    ),
  ]
);

// ============================================================================
// TABLE 6: symptom_submissions
// ============================================================================

export const symptomSubmissions = pgTable(
  "symptom_submissions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rawText: text("raw_text").notNull(),
    inputLanguage: languageEnum("input_language").notNull(),
    aiTriageSummary: jsonb("ai_triage_summary"),
    urgencyLevel: urgencyEnum("urgency_level"),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_symptom_submissions_appointment").on(table.appointmentId),
  ]
);

// ============================================================================
// TABLE 7: post_visit_summaries
// ============================================================================

export const postVisitSummaries = pgTable(
  "post_visit_summaries",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    physicianNotes: text("physician_notes").notNull(),
    aiDischargeSummary: jsonb("ai_discharge_summary"),
    targetLanguage: languageEnum("target_language").notNull(),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_post_visit_summaries_appointment").on(table.appointmentId),
  ]
);

// ============================================================================
// TABLE 8: prescriptions
// ============================================================================

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    medications: jsonb("medications").notNull(),
    reminderFrequency: text("reminder_frequency").notNull(),
    reminderEndDate: date("reminder_end_date").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_prescriptions_patient").on(table.patientId),
    index("idx_prescriptions_active").on(table.isActive),
  ]
);

// ============================================================================
// TABLE 9: email_logs
// ============================================================================

export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    recipientEmail: text("recipient_email").notNull(),
    provider: text("provider").notNull(), // 'RESEND' | 'BREVO'
    templateName: text("template_name").notNull(),
    status: text("status").notNull(), // 'SENT' | 'FAILED' | 'RETRYING'
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_email_logs_recipient").on(table.recipientEmail)]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  doctor: one(doctors, {
    fields: [users.id],
    references: [doctors.userId],
  }),
  appointments: many(appointments),
  symptomSubmissions: many(symptomSubmissions),
  prescriptions: many(prescriptions),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  slots: many(slots),
  leaves: many(doctorLeaves),
  appointments: many(appointments),
}));

export const doctorLeavesRelations = relations(doctorLeaves, ({ one }) => ({
  doctor: one(doctors, {
    fields: [doctorLeaves.doctorId],
    references: [doctors.id],
  }),
}));

export const slotsRelations = relations(slots, ({ one }) => ({
  doctor: one(doctors, {
    fields: [slots.doctorId],
    references: [doctors.id],
  }),
}));

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    patient: one(users, {
      fields: [appointments.patientId],
      references: [users.id],
    }),
    doctor: one(doctors, {
      fields: [appointments.doctorId],
      references: [doctors.id],
    }),
    slot: one(slots, {
      fields: [appointments.slotId],
      references: [slots.id],
    }),
    symptomSubmission: one(symptomSubmissions, {
      fields: [appointments.id],
      references: [symptomSubmissions.appointmentId],
    }),
    postVisitSummary: one(postVisitSummaries, {
      fields: [appointments.id],
      references: [postVisitSummaries.appointmentId],
    }),
    prescriptions: many(prescriptions),
  })
);

export const symptomSubmissionsRelations = relations(
  symptomSubmissions,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [symptomSubmissions.appointmentId],
      references: [appointments.id],
    }),
    patient: one(users, {
      fields: [symptomSubmissions.patientId],
      references: [users.id],
    }),
  })
);

export const postVisitSummariesRelations = relations(
  postVisitSummaries,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [postVisitSummaries.appointmentId],
      references: [appointments.id],
    }),
  })
);

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  appointment: one(appointments, {
    fields: [prescriptions.appointmentId],
    references: [appointments.id],
  }),
  patient: one(users, {
    fields: [prescriptions.patientId],
    references: [users.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, () => ({}));
