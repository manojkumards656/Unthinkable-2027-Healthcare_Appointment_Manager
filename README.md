# 🏥 Enterprise Healthcare Appointment & Follow-Up Platform

> **A production-ready, zero-cost, trilingual healthcare platform featuring tri-mode accessibility, two-tier concurrency-safe slot reservations, AI clinical triage & localized discharge instructions, doctor leave sagas, and dual-provider email failover.**

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.0-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.38-C5F74F?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![Neon PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=flat&logo=postgresql)](https://neon.tech/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis-00E599?style=flat&logo=redis)](https://upstash.com/)
[![Inngest v4](https://img.shields.io/badge/Inngest-v4.18-FF5A54?style=flat&logo=inngest)](https://www.inngest.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?style=flat&logo=google)](https://aistudio.google.com/)
[![Firebase Auth](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat&logo=firebase)](https://firebase.google.com/)

---

## 🌐 Live Links

- **🚀 Live Application URL:** [https://unthinkable-2027-healthcare-appoint.vercel.app](https://unthinkable-2027-healthcare-appoint.vercel.app)
- **📦 GitHub Repository:** [https://github.com/manojkumards656/Unthinkable-2027-Healthcare_Appointment_Manager](https://github.com/manojkumards656/Unthinkable-2027-Healthcare_Appointment_Manager)

---

## 📑 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Key System Features](#-key-system-features)
3. [User Roles & Portals](#-user-roles--portals)
4. [Technology Stack & Free Tier Topology](#-technology-stack--free-tier-topology)
5. [Environment Variables Reference](#-environment-variables-reference)
6. [Step-by-Step Setup & Deployment](#-step-by-step-setup--deployment)
7. [System Design & Architecture Write-Up (≤800 Words)](#-system-design--architecture-write-up-800-words)
8. [API Route Reference](#-api-route-reference)
9. [Database Schema](#-database-schema)

---

## 🏛️ Architecture Overview

```
                                  ┌─────────────────────────────┐
                                  │   Next.js 15 App Router     │
                                  │ (Vercel Serverless / Edge)  │
                                  └──────────────┬──────────────┘
                                                 │
                       ┌─────────────────────────┼─────────────────────────┐
                       ▼                         ▼                         ▼
            ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
            │   Firebase Auth    │    │   next-intl i18n   │    │  Tri-Mode Theming  │
            │  (Custom Claims)   │    │   (EN / TA / HI)   │    │(Light/OLED/Senior) │
            └────────────────────┘    └────────────────────┘    └────────────────────┘
                       │
                       ▼
         ┌───────────────────────────────────────────────────────────────────────────┐
         │                   Two-Tier Concurrency Booking Engine                     │
         │                                                                           │
         │   Layer 1: Upstash Redis Distributed Lock (`SET NX PX 5000`)              │
         │   Layer 2: Neon PostgreSQL Transaction (`SELECT FOR UPDATE NOWAIT`)       │
         │   Safety Net: Partial Unique Index (`idx_prevent_double_booking`)         │
         └─────────────────────────────────────┬─────────────────────────────────────┘
                                               │
                 ┌─────────────────────────────┼─────────────────────────────┐
                 ▼                             ▼                             ▼
        ┌──────────────────┐         ┌───────────────────┐        ┌──────────────────┐
        │  Neon PostgreSQL │         │  Google Gemini AI │        │ Inngest Engine   │
        │  (Drizzle ORM    │         │  (Gemini 2.5      │        │ (Leave Sagas,    │
        │   WebSocket Pool)│         │   Flash + PHI     │        │  Crons, 24h Appt │
        │                  │         │   Anonymizer)     │        │  & Med Reminders)│
        └──────────────────┘         └───────────────────┘        └─────────┬────────┘
                                                                            │
                                                          ┌─────────────────┴────────┐
                                                          ▼                          ▼
                                               ┌──────────────────┐       ┌──────────────────┐
                                               │  Resend (Primary)│       │ Brevo (Fallback) │
                                               │  100/day Tracker │       │ 300/day SMTP     │
                                               └──────────────────┘       └──────────────────┘
```

---

## 🌟 Key System Features

### 1. High-Concurrency Two-Tier Booking Engine
- **Layer 1 (Edge Mutex):** Fast-fails concurrent booking attempts at the edge via Upstash Redis atomic `SET NX PX 5000` with unique UUID ownership tokens.
- **Layer 2 (PostgreSQL Row Lock):** Uses `@neondatabase/serverless` WebSocket driver with `SELECT id, status FROM slots WHERE ... FOR UPDATE NOWAIT` on pre-populated 30-minute interval slots.
- **ACID Safety Net:** Partial unique index:
  ```sql
  CREATE UNIQUE INDEX idx_prevent_double_booking
    ON appointments (doctor_id, appointment_timestamp)
    WHERE status IN ('PENDING', 'CONFIRMED');
  ```

### 2. Inngest Doctor Leave Propagation Saga
- **Atomic Leave Saga:** Triggered when an Admin approves doctor leave:
  - **Step 1 (`cancel-conflicting-bookings`):** Single ACID transaction marks slots `UNAVAILABLE` and cancels active bookings as `CANCELLED_BY_PROVIDER`.
  - **Step 2 (`generate-reschedule-tokens`):** Generates 72-hour priority reschedule tokens stored in Upstash Redis (`reschedule:token:{token}`).
  - **Step 3 (Fan-out Notifications):** Isolated `step.run()` per patient sends localized emails with 1-click priority rebooking links.

### 3. HIPAA-Compliant AI Clinical Processing
- **PHI Anonymization Layer (`anonymizer.ts`):** Automatically scrubs patient names, emails, phone numbers (US & Indian), national IDs (Aadhaar), DOBs, and internal UUIDs before prompt construction.
- **Pre-Visit Triage Agent (`intake-agent.ts`):** Analyzes patient symptoms using **Gemini 2.5 Flash** with structured JSON schemas to extract chief complaint, symptom duration, pain scale (1-10), emergency red flags, and 3 diagnostic questions for the doctor.
- **Post-Visit Discharge Agent (`discharge-agent.ts`):** Converts complex physician EHR notes into **4th-grade reading level** discharge instructions in English, Tamil, or Hindi.

### 4. Trilingual Support & Tri-Mode Accessibility
- **Languages:** English (`en`), தமிழ் Tamil (`ta`), हिन्दी Hindi (`hi`) with native font subsetting (`Noto Sans`, `Noto Sans Tamil`, `Noto Sans Devanagari`).
- **Tri-Mode Theming:**
  - **Light Mode:** Standard clinical theme (WCAG AA 4.5:1).
  - **OLED Dark Mode:** Pure `#000000` background with `#F4F4F5` typography to minimize halation and battery drain.
  - **Senior Mode:** 125% base typography scale, 56px minimum touch targets, 2px solid borders, and maximum high-contrast color palette (WCAG AAA 7:1+).

### 5. Resilient Email Dispatcher
- **Primary:** Resend (tracked with a Redis daily counter staying under the 100/day limit).
- **Fallback:** Brevo v4 API on 5xx/network timeouts.
- **Smart Error Classification:** 4xx client errors (e.g., malformed email) throw immediately without failing over; 5xx errors automatically route to Brevo.

---

## 👥 User Roles & Portals

### 🧑‍⚕️ 1. Patient Portal (`/[locale]/dashboard/patient` & `/[locale]/book`)
- **Interactive Booking Wizard:** Select specialist, pick available 30-minute slots, and submit pre-visit symptoms.
- **My Consultations:** Filter upcoming, past, and cancelled appointments.
- **Prescription Tracker:** View active medications and daily dosage instructions.
- **Calendar Integration:** 1-click Google Calendar sync.

### 👨‍⚕️ 2. Doctor Console (`/[locale]/dashboard/doctor`)
- **Queue Management:** View today's patient queue with AI triage urgency badges (`HIGH`, `MEDIUM`, `LOW`).
- **Pre-Visit Clinical Summary:** Review chief complaint, duration, and AI-suggested diagnostic questions.
- **EHR Documentation:** Input physician notes, generate 4th-grade patient discharge instructions, prescribe medications, and set reminder frequencies.
- **Leave Filing:** Submit leave requests with date ranges and emergency reasons.

### 🛠️ 3. Admin Portal (`/[locale]/dashboard/admin`)
- **Doctor Staff Management:** Register physicians, configure qualifications, languages spoken, and weekly 9:00 AM–5:00 PM hours.
- **Leave Approvals:** Review and approve/reject leave requests (approving instantly fires the Inngest Saga).
- **Bulk Slot Generator:** Pre-populate 30-minute consultation blocks for all active physicians across 7 to 30 days.

### 🔄 4. Priority Reschedule Portal (`/[locale]/reschedule?token=...`)
- Allows patients affected by doctor leave to redeem their 72-hour priority token to rebook an alternate slot.

---

## 🧰 Technology Stack & Free Tier Topology

| Component | Technology | Free Tier Limits | Role |
|---|---|---|---|
| **Framework** | Next.js 15 (App Router, React 19) | 100 GB bandwidth / 1M invocations | Server Components, Server Actions, Edge Middleware |
| **Database** | Neon Serverless PostgreSQL | 0.5 GB storage, 100 CU-hrs/mo | Relational data (`Pool` WebSocket driver) |
| **ORM** | Drizzle ORM | Open Source | Type-safe SQL, relations, migrations |
| **Cache & Locks** | Upstash Redis | 256 MB, 500K commands/mo | Distributed locks (`SET NX PX 5000`), 72h tokens |
| **Background Jobs** | Inngest v4 | 50,000 steps/mo | Leave sagas, 24h reminders, daily medication crons |
| **Email** | Resend + Brevo | 100/day (Resend), 300/day (Brevo) | Transactional notifications with automatic failover |
| **AI / LLM** | Google Gemini 2.5 Flash | 15 RPM, ~1,500 req/day | Structured clinical triage & localized discharge |
| **Authentication** | Firebase Auth | 50,000 MAU free | Custom claims (`role`) & HTTP-only session cookies |
| **Calendar** | Google Calendar API | 10,000 req/min free | OAuth 2.0 appointment synchronization |

---

## 🔑 Environment Variables Reference

Create a `.env.local` file based on [`.env.example`](.env.example):

```env
# ==============================================================================
# Database (Neon Serverless PostgreSQL — WebSocket Driver)
# ==============================================================================
DATABASE_URL="postgresql://neondb_owner:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# ==============================================================================
# Distributed Locks & Cache (Upstash Redis REST API)
# ==============================================================================
UPSTASH_REDIS_REST_URL="https://your-database.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxxASQgxxxx..."

# ==============================================================================
# Clinical AI (Google Gemini 2.5 Flash)
# ==============================================================================
GEMINI_API_KEY="AIzaSySampleGeminiApiKey123456789"

# ==============================================================================
# Firebase Authentication (Client & Server Admin SDK)
# ==============================================================================
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSySampleFirebaseWebClientApiKey"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-app-id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk@your-app-id.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\n-----END PRIVATE KEY-----\n"

# ==============================================================================
# Transactional Email Dispatcher (Resend Primary + Brevo Fallback)
# ==============================================================================
RESEND_API_KEY="re_sample_resend_api_key_12345"
EMAIL_FROM="Healthcare Platform <onboarding@resend.dev>"
BREVO_API_KEY="xkeysib-sample_brevo_api_key_12345"

# ==============================================================================
# Background Workflows & Sagas (Inngest)
# ==============================================================================
INNGEST_EVENT_KEY="inngest_event_sample_key"
INNGEST_SIGNING_KEY="signkey-sample_signing_key"

# ==============================================================================
# Google Calendar OAuth 2.0 Integration (Optional)
# ==============================================================================
GOOGLE_CLIENT_ID="sample_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-sample_google_client_secret"

# ==============================================================================
# Public Application URL
# ==============================================================================
NEXT_PUBLIC_APP_URL="https://unthinkable-2027-healthcare-appoint.vercel.app"
```

---

## 🚀 Step-by-Step Setup & Deployment

### 1. Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/manojkumards656/Unthinkable-2027-Healthcare_Appointment_Manager.git
cd Unthinkable-2027-Healthcare_Appointment_Manager

# 2. Install dependencies
npm install

# 3. Create .env.local and fill in your keys
cp .env.example .env.local

# 4. Push schema to your Neon PostgreSQL database
npx drizzle-kit push

# 5. Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

### 2. Vercel Production Deployment Guide

1. **Import Repository:**
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select `Unthinkable-2027-Healthcare_Appointment_Manager`.
   - Framework preset will automatically detect **Next.js**.

2. **Add Environment Variables:**
   - In Vercel Project Settings ➔ **Environment Variables**, add the keys from your `.env.local`.

3. **Deploy:**
   - Click **Deploy**. Vercel will run Turbopack and deploy the app with 17 static pages and 15 serverless API routes.

---

## 📝 System Design & Architecture Write-Up (≤800 Words)

### 1. Concurrency & Double-Booking Prevention Engine
In outpatient healthcare systems, simultaneous attempts by multiple patients to book the same appointment slot represent a high-severity concurrency risk. This platform implements a **two-tier defense-in-depth barrier**:

1. **Edge Tier (Upstash Redis Distributed Mutex):**
   When a booking request arrives, the system attempts an atomic Redis `SET NX PX` command with a 5,000ms TTL and a unique UUID ownership token (`lock:doctor:{id}:slot:{timestamp}`). If another request holds this key, the incoming attempt is immediately rejected with a `409 Conflict (SLOT_BUSY)` without touching the database connection pool. Lock releases verify the UUID token before deletion to avoid releasing expired locks acquired by subsequent callers.

2. **Database Tier (Pessimistic Row Locking in Neon PostgreSQL):**
   Slots are pre-populated in 30-minute intervals in the `slots` table. The transaction executes:
   ```sql
   SELECT id, status FROM slots 
   WHERE id = $slotId AND doctor_id = $doctorId AND slot_timestamp = $ts 
   FOR UPDATE NOWAIT;
   ```
   If another concurrent transaction is executing on the same slot, Postgres raises error `55P03 (lock_not_available)`, immediately failing the transaction cleanly.

3. **ACID Safety Net (Partial Unique Constraint):**
   At the relational storage boundary, the `appointments` table enforces:
   ```sql
   CREATE UNIQUE INDEX idx_prevent_double_booking
     ON appointments (doctor_id, appointment_timestamp)
     WHERE status IN ('PENDING', 'CONFIRMED');
   ```
   Even under network partition or Redis downtime, PostgreSQL rejects duplicate simultaneous insertions with error `23505 (unique_violation)`.

---

### 2. Inngest Doctor Leave Propagation Saga
When a physician files approved emergency or scheduled leave, all active patient appointments across that date interval must be invalidated atomically, followed by resilient patient notification dispatches.

Using **Inngest v4**, this workflow executes as an idempotent multi-step saga:
- **`cancel-conflicting-bookings`:** Runs a single PostgreSQL transaction that transitions `slots.status` to `UNAVAILABLE` and `appointments.status` to `CANCELLED_BY_PROVIDER`, returning the affected patient IDs and original appointment timestamps.
- **`generate-reschedule-tokens`:** Generates high-entropy priority reschedule tokens stored in Upstash Redis with a 72-hour TTL (`reschedule:token:{token}`).
- **`notify-patient-{id}` (Fan-Out):** Individual step executions send localized emails containing one-click priority rebooking links. Because each email is an isolated Inngest step, a temporary network failure on patient #7 triggers exponential retries only for patient #7 without re-cancelling appointments or double-emailing patients #1 through #6.

---

### 3. Dual-Provider Transactional Email Failover
To adhere strictly to zero-cost cloud limits while ensuring 99.9% notification reliability:
- **Resend** acts as the primary provider (3,000 emails/month free tier). Because Resend enforces a strict 100 email/day cap, an Upstash Redis counter (`email:resend:daily:YYYY-MM-DD`) tracks daily volume.
- If daily volume exceeds 90 emails or if Resend returns a `5xx` server error or network timeout, the request seamlessly falls over to **Brevo** (300 emails/day free tier).
- Crucially, client errors (`4xx` such as invalid email syntax or rejected recipient) are classified and thrown immediately without triggering failover, preventing double-rejection across both providers.

---

### 4. HIPAA-Compliant AI Clinical Processing
Patient intake texts are processed via **Google Gemini 2.5 Flash** with strictly structured JSON response schemas (`responseMimeType: 'application/json'`). To mitigate PHI/HIPAA compliance risks on cloud tiers, the incoming text passes through a regex-based **anonymization layer** (`anonymizer.ts`) that scrubs patient names, email addresses, phone numbers, national IDs, and date-of-birth patterns before prompt construction. The doctor console renders structured triage assessments (urgency level, red-flag alerts, suggested diagnostic questions) while post-visit notes are synthesized into 4th-grade reading level discharge summaries in English, Tamil, or Hindi.

---

## 📡 API Route Reference

| Endpoint | Method | Access | Purpose |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Register user in Firebase + Postgres `users` (+ `doctors` if DOCTOR). |
| `/api/auth/session` | `POST` / `DELETE` | Public | **POST:** Creates HTTP-only `__session` cookie.<br>**DELETE:** Clears cookie on logout. |
| `/api/auth/google-calendar/url` | `GET` | Authenticated | Generates Google OAuth 2.0 authorization URL. |
| `/api/auth/google-calendar/callback` | `GET` | Authenticated | OAuth callback saving refresh token in PostgreSQL. |
| `/api/appointments` | `GET` | Authenticated | List filtered appointments (Patient: own, Doctor: queue, Admin: all). |
| `/api/appointments` | `POST` | `PATIENT` | Concurrency-safe booking with Redis lock + row lock + calendar + email. |
| `/api/appointments/[id]` | `GET` / `PATCH` | Authenticated | Get appointment details or cancel/update status. |
| `/api/doctors` | `GET` / `POST` | Public / `ADMIN` | **GET:** List active doctors.<br>**POST:** Admin adds new doctor. |
| `/api/doctors/[id]` | `GET` | Public | Single doctor profile with working hours. |
| `/api/doctor/leaves` | `GET` / `POST` / `PATCH` | `DOCTOR` / `ADMIN` | **PATCH:** Admin approves leave ➔ triggers Inngest saga. |
| `/api/doctor/notes` | `POST` | `DOCTOR` | Submit EHR notes ➔ Gemini 4th-grade discharge summary ➔ prescriptions. |
| `/api/slots` | `GET` | Public | Query open 30-minute consultation slots for a doctor. |
| `/api/slots/generate` | `POST` | `ADMIN` | Pre-populate 30-minute slots across doctors for N days. |
| `/api/symptoms` | `POST` | `PATIENT` | Submit symptom description ➔ PHI scrubbing ➔ Gemini triage. |
| `/api/reschedule/validate` | `GET` | Public | Validates 72-hour priority reschedule token from Redis. |
| `/api/inngest` | `ALL` | Inngest | Serves leave sagas, crons, and reminders. |

---

## 🗃️ Database Schema

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      users      │───────│     doctors     │───────│  doctor_leaves  │
├─────────────────┤ 1   1 ├─────────────────┤ 1   * ├─────────────────┤
│ id (UUID, PK)   │       │ id (UUID, PK)   │       │ id (UUID, PK)   │
│ firebase_uid    │       │ user_id (FK)    │       │ doctor_id (FK)  │
│ name            │       │ specialty       │       │ start_date      │
│ email           │       │ working_hours   │       │ end_date        │
│ role            │       │ slot_duration   │       │ status          │
│ language        │       └────────┬────────┘       └─────────────────┘
│ gcal_token      │                │ 1
└────────┬────────┘                │
         │ 1                       │ *
         │ *              ┌────────┴────────┐
         │        ┌───────│      slots      │
         │        │ 1   * ├─────────────────┤
         │        │       │ id (UUID, PK)   │
         │        │       │ doctor_id (FK)  │
         │        │       │ slot_timestamp  │
         │        │       │ status          │
         │        │       └─────────────────┘
         ▼        ▼
┌─────────────────────────────────┐
│          appointments           │
├─────────────────────────────────┤
│ id (UUID, PK)                   │
│ patient_id (FK -> users)        │
│ doctor_id (FK -> doctors)       │
│ slot_id (FK -> slots)           │
│ appointment_timestamp (TIMESTAMPTZ)
│ status                          │
│ google_calendar_event_id        │
│ [UNIQUE: doctor_id + timestamp] │
└───────┬──────────────┬──────────┘
        │ 1            │ 1
        ▼ 1            ▼ 1
┌─────────────────┐ ┌─────────────────────┐ ┌─────────────────┐
│symptom_submiss. │ │post_visit_summaries │ │  prescriptions  │
├─────────────────┤ ├─────────────────────┤ ├─────────────────┤
│ id (UUID, PK)   │ │ id (UUID, PK)       │ │ id (UUID, PK)   │
│ raw_text        │ │ physician_notes     │ │ medications     │
│ ai_triage_sum.  │ │ ai_discharge_sum.   │ │ reminder_freq.  │
│ urgency_level   │ │ target_language     │ │ reminder_end    │
└─────────────────┘ └─────────────────────┘ └─────────────────┘
```

---

## 🔒 License
MIT License. Built for clinical performance, trilingual accessibility, and zero-cost cloud operations.
