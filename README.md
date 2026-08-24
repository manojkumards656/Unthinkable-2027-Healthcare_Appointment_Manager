# Enterprise Healthcare Appointment & Follow-Up Platform

A production-ready, trilingual (**English, தமிழ் / Tamil, हिन्दी / Hindi**), and tri-mode accessible healthcare scheduling platform engineered for zero-cost cloud topologies, zero double-booking concurrency guarantees, and AI-driven clinical workflow optimization.

---

## Tech Stack Overview

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Framework** | Next.js 15 (App Router, React 19, TypeScript) | Server components, localized routing (`next-intl`), Edge middleware |
| **Database** | Neon PostgreSQL + Drizzle ORM | Persistent relational storage using WebSocket driver (`Pool`) |
| **Concurrency / Cache** | Upstash Redis (HTTP REST) | Distributed locks, 72h priority reschedule tokens, rate limit counters |
| **Event Sagas & Cron** | Inngest | Async doctor leave propagation sagas, 24h reminders, 8 AM medication cron |
| **Transactional Email** | Resend (Primary) + Brevo (Failover) | High-deliverability dual-transport messaging with DB audit logs |
| **Generative AI** | Google GenAI SDK (`gemini-2.5-flash`) | Pre-visit EHR triage extraction, PHI sanitization, 4th-grade discharge simplification |
| **Authentication** | Firebase Authentication + Admin SDK | Session cookie management (`__session`), role-based claims (PATIENT, DOCTOR, ADMIN) |
| **Calendar Sync** | Google Calendar API (OAuth 2.0) | Automated consultation event synchronization and deletion |
| **Design & Accessibility** | Tailwind CSS v4 + `next/font/google` | Tri-Mode Theming (`light`, `oled`, `senior`), Noto Sans font families |

---

## System Design & Architecture Write-Up (≤ 800 Words)

### 1. Zero Double-Booking Prevention: Two-Tier Concurrency Control
Medical appointment booking under concurrent serverless workloads poses a critical time-of-check to time-of-use (TOCTOU) race condition hazard. If two patients simultaneously request the exact same 30-minute doctor slot, naive verification will allow both write operations to proceed.

To eliminate this vulnerability, the platform employs a **two-tier concurrency defense-in-depth barrier**:
- **Layer 1 (Network Edge / Distributed Lock):** Prior to database access, the booking handler attempts to acquire an exclusive distributed mutex in Upstash Redis via atomic `SET lock:doctor:${doctorId}:slot:${timestamp} ${token} NX PX 5000`. If another concurrent request holds the key, the incoming caller immediately fails fast with HTTP 409 (`SLOT_BUSY`), shielding persistent database connections from thundering herd contention.
- **Layer 2 (Persistence Tier / ACID Guarantee):** Within an isolated PostgreSQL transaction executed over the stateful `@neondatabase/serverless` WebSocket driver, the engine issues `SELECT id, status FROM slots WHERE id = ${slotId} FOR UPDATE NOWAIT`. If another concurrent process has locked the row, PostgreSQL terminates the lock attempt instantly with error `55P03` instead of hanging the thread.
- **Absolute Failsafe (Partial Unique Index):** As the ultimate database constraint, table `appointments` enforces:
  ```sql
  CREATE UNIQUE INDEX idx_prevent_double_booking
    ON appointments (doctor_id, appointment_timestamp)
    WHERE status IN ('PENDING', 'CONFIRMED');
  ```
  Even if cache keys expire mid-transaction or row locks are bypassed, PostgreSQL strictly prohibits duplicate active bookings, rejecting collisions with unique violation error `23505`.

### 2. Asynchronous Doctor Leave Propagation Pipeline
When a physician declares emergency or planned leave, cancelling overlapping appointments, generating priority reschedule links, and notifying patients inside a single synchronous HTTP request risks serverless gateway timeouts and partial failures.

The system encapsulates this process in an **Inngest multi-step background saga** triggered by `doctor/leave.declared`:
1. **Step 1 (`cancel-conflicting-bookings`):** A single atomic database transaction marks conflicting slots as `UNAVAILABLE` and cancels affected appointments with status `CANCELLED_BY_PROVIDER`.
2. **Step 2 (`generate-reschedule-tokens`):** Cryptographic UUID tokens are generated and cached in Upstash Redis (`reschedule:token:${token}`) with a 72-hour time-to-live (`259200000 ms`).
3. **Step 3 (Fan-Out Patient Notifications):** Inngest iterates over affected patients, executing **individual memoized `step.run()` actions** per patient. If the transactional email transport fails on recipient #5, Inngest's checkpointing automatically retries that specific recipient with exponential backoff up to 5 times without duplicating database updates or re-emailing prior patients.

### 3. Slot Hold & Atomic Release Mechanism
Slots are allocated a short-lived 5000ms Redis lock window during the transaction. Once the booking transaction commits and transitions slot status to `RESERVED` / `BOOKED`, the lock is released safely by verifying that the cached token matches the current caller's cryptographic UUID token before executing `DEL`, preventing inadvertent eviction of subsequent lock acquisitions.

### 4. Notification Failure & Dual-Transport Email Failover
To guarantee transactional deliverability under strict zero-cost infrastructure limits (Resend 100/day tier limits):
- Every outgoing email checks the daily counter in Redis (`email:resend:daily:${today}`). If the count is below 90, **Resend** is utilized.
- If Resend encounters a 5xx infrastructure timeout, connection drop, or rate quota breach, execution automatically falls through to the **Brevo (Sendinblue)** transactional API fallback.
- Client-side 4xx errors (e.g. malformed email addresses) are intentionally exempted from failover to prevent redundant provider penalties.
- Every dispatch event is recorded in the `email_logs` database table with timestamp, provider, template name, and error status.

---

## Step-by-Step Setup Guide

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd medplatform
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and populate the required API credentials:
```bash
cp .env.example .env.local
```

### 3. Run Database Migrations
Push the Drizzle ORM schema to your serverless Neon PostgreSQL database:
```bash
npx drizzle-kit push
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the platform.

---

## Database Schema Structure

```
+------------------+       +-------------------+       +-----------------------+
|      users       |       |      doctors      |       |         slots         |
+------------------+       +-------------------+       +-----------------------+
| id (PK)          |<-----\| id (PK)           |<-----\| id (PK)               |
| firebase_uid (UQ)|       | user_id (FK, UQ)  |       | doctor_id (FK)        |
| name             |       | name              |       | slot_timestamp        |
| email (UQ)       |       | specialty         |       | end_timestamp         |
| role             |       | languages_spoken  |       | status (enum)         |
| language         |       | working_hours     |       +-----------------------+
+------------------+       +-------------------+                   |
        |                           |                              |
        |                           v                              |
        |                  +-------------------+                   |
        |                  |   doctor_leaves   |                   |
        |                  +-------------------+                   |
        |                  | id (PK)           |                   |
        |                  | doctor_id (FK)    |                   |
        |                  | start_date        |                   |
        |                  | end_date          |                   |
        |                  | status (enum)     |                   |
        |                  +-------------------+                   |
        |                                                          |
        |                  +---------------------------------------+
        |                  |
        v                  v
+------------------------------------------------------+
|                    appointments                      |
+------------------------------------------------------+
| id (PK)                                              |
| patient_id (FK)                                      |
| doctor_id (FK)                                       |
| slot_id (FK)                                         |
| appointment_timestamp                                |
| status (enum: PENDING, CONFIRMED, CANCELLED, ...)    |
| google_calendar_event_id                             |
| idx_prevent_double_booking (PARTIAL UNIQUE INDEX)    |
+------------------------------------------------------+
        |                           |
        v                           v
+-----------------------+   +-------------------------------+
|  symptom_submissions  |   |     post_visit_summaries      |
+-----------------------+   +-------------------------------+
| id (PK)               |   | id (PK)                       |
| appointment_id (FK)   |   | appointment_id (FK)           |
| patient_id (FK)       |   | physician_notes               |
| raw_text              |   | ai_discharge_summary (JSON)   |
| input_language        |   | target_language               |
| ai_triage_summary     |   | status                        |
| urgency_level         |   +-------------------------------+
+-----------------------+                   |
                                            v
                                    +-----------------------+
                                    |     prescriptions     |
                                    +-----------------------+
                                    | id (PK)               |
                                    | appointment_id (FK)   |
                                    | patient_id (FK)       |
                                    | medications (JSON)    |
                                    | reminder_frequency    |
                                    | reminder_end_date     |
                                    +-----------------------+
```

---

## API Catalog

| Method | Endpoint | Description | Auth Requirement |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register user in Firebase + PostgreSQL | Public |
| `POST` | `/api/auth/session` | Create HTTP-only session cookie from Firebase ID token | Public |
| `DELETE`| `/api/auth/session` | Clear session cookie (Logout) | Public |
| `GET` | `/api/auth/google-calendar/url` | Get Google Calendar OAuth authorization link | Authenticated |
| `GET` | `/api/auth/google-calendar/callback` | OAuth redirect callback handler | Public |
| `GET` | `/api/doctors` | List active doctors with specialty/language filters | Public |
| `POST` | `/api/doctors` | Create new doctor profile | Admin |
| `GET` | `/api/doctors/[id]` | Fetch doctor profile details | Public |
| `PUT` | `/api/doctors/[id]` | Update doctor profile details | Admin |
| `GET` | `/api/slots` | Fetch available slots for doctor and date | Public |
| `POST` | `/api/slots/generate` | Batch generate 30-min schedule slots | Admin |
| `GET` | `/api/appointments` | List appointments for patient / doctor / admin | Authenticated |
| `POST` | `/api/appointments` | Concurrency-safe slot reservation + AI triage trigger | Authenticated |
| `GET` | `/api/appointments/[id]` | Retrieve detailed appointment & clinical summaries | Authenticated |
| `PUT` | `/api/appointments/[id]` | Cancel appointment & delete calendar event | Authenticated |
| `POST` | `/api/symptoms` | Submit patient symptoms & run AI pre-visit intake | Authenticated |
| `POST` | `/api/doctor/notes` | Submit physician notes, generate AI discharge, create Rx | Doctor / Admin |
| `GET` | `/api/doctor/leaves` | List doctor leave requests | Doctor / Admin |
| `POST` | `/api/doctor/leaves` | Request doctor leave | Doctor / Admin |
| `PUT` | `/api/doctor/leaves` | Approve/Reject leave (Triggers Inngest Saga) | Admin |
| `GET` | `/api/reschedule/validate` | Validate 72-hour priority reschedule token | Public |
| `POST` | `/api/reschedule/validate` | Consume token and book replacement appointment | Public |
| `GET/POST`| `/api/inngest` | Inngest background event and saga webhook handler | Inngest Engine |

---

## AI LLM Prompts & Schemas

### 1. Pre-Visit Symptom Triage (`gemini-2.5-flash`)
- **System Instruction:**
  ```
  You are an expert emergency medicine triage assistant.
  Analyze the incoming patient symptom description provided in English, Tamil, or Hindi.
  Extract key clinical metrics and generate a concise EHR pre-visit summary in English for the doctor.
  Identify any emergency red-flag symptoms (e.g., chest pain, acute dyspnea, sudden neurological deficits).
  Suggest 3 relevant questions the doctor should ask during the visit.
  ```
- **Response Schema:**
  - `chiefComplaint`: string
  - `symptomDurationDays`: integer
  - `painScaleOneToTen`: integer (1-10)
  - `urgencyLevel`: enum (`Low`, `Medium`, `High`)
  - `redFlagAlerts`: array of strings
  - `suggestedDoctorQuestions`: array of strings
  - `formattedClinicalSummary`: string

### 2. Post-Visit Discharge Simplification (`gemini-2.5-flash`)
- **System Instruction:**
  ```
  You are a patient advocate and medical communicator.
  Translate the physician's clinical notes into clear, 4th-grade reading level discharge instructions.
  Produce the output in ${languageMap[targetLanguage]}.
  Ensure all medication schedules, care steps, and emergency warning signs are easy to read and unambiguous.
  ```
- **Response Schema:**
  - `simplifiedDiagnosis`: string
  - `medicationInstructions`: array of objects (`medicationName`, `purpose`, `timingAndDosage`)
  - `homeCareSteps`: array of strings
  - `warningSignsToReturn`: array of strings
  - `followUpRecommendation`: string

---

## Google Calendar OAuth 2.0 Configuration
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create an OAuth 2.0 Client ID for Web Applications.
3. Add Authorized Redirect URI: `http://localhost:3000/api/auth/google-calendar/callback` (or your production domain).
4. Set Scopes: `https://www.googleapis.com/auth/calendar.events`.
5. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`.
6. Patients and doctors can connect their calendar from their dashboard to automatically synchronize booked consultations.
