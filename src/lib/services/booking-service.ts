import { db } from "@/db";
import { appointments, slots } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getRedisClient } from "@/lib/redis";
import crypto from "crypto";


// ============================================================================
// Types
// ============================================================================

export type BookingErrorCode =
  | "SLOT_NOT_FOUND"
  | "SLOT_UNAVAILABLE"
  | "CONFLICT_DOUBLE_BOOKING"
  | "SLOT_BUSY"
  | "UNKNOWN_ERROR";

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  error?: BookingErrorCode;
}

// ============================================================================
// Constants
// ============================================================================

/** Redis lock TTL in milliseconds. 5 seconds is sufficient to cover
 *  a DB transaction under normal conditions. If it expires, the partial
 *  unique index on appointments acts as the ultimate safety net. */
const LOCK_TTL_MS = 5000;

// ============================================================================
// Internal Error Class (used to throw typed errors within transactions)
// ============================================================================

class SlotBookingError extends Error {
  constructor(
    public readonly code: "SLOT_NOT_FOUND" | "SLOT_UNAVAILABLE"
  ) {
    super(code);
    this.name = "SlotBookingError";
  }
}

// ============================================================================
// Main Export: Two-Tier Concurrency-Safe Booking
// ============================================================================

/**
 * Processes a slot booking with two-tier concurrency control:
 *
 * LAYER 1 — Redis Distributed Lock (edge backpressure):
 *   Acquires an exclusive short-lived lock via atomic SET NX PX.
 *   Rejects concurrent requests instantly without hitting the DB.
 *
 * LAYER 2 — PostgreSQL Transaction + Row Lock:
 *   SELECT ... FOR UPDATE NOWAIT on the pre-populated slot row.
 *   If another transaction holds the lock, PostgreSQL rejects immediately
 *   (error 55P03) without blocking the connection.
 *
 * SAFETY NET — Partial Unique Index:
 *   idx_prevent_double_booking on appointments(doctor_id, appointment_timestamp)
 *   WHERE status IN ('PENDING', 'CONFIRMED') ensures ACID-level uniqueness
 *   even if both Redis and row locks fail simultaneously.
 */
export async function processSlotBooking(
  patientId: string,
  doctorId: string,
  slotId: string,
  slotTimestamp: Date
): Promise<BookingResult> {
  const redis = getRedisClient();
  const lockKey = `lock:doctor:${doctorId}:slot:${slotTimestamp.getTime()}`;
  const lockToken = crypto.randomUUID();
  let lockAcquired = false;

  // ── LAYER 1: Redis Distributed Lock ─────────────────────────────────
  if (redis) {
    try {
      const result = await redis.set(lockKey, lockToken, {
        nx: true,
        px: LOCK_TTL_MS,
      });
      if (!result) {
        return { success: false, error: "SLOT_BUSY" };
      }
      lockAcquired = true;
    } catch (redisError) {
      // Redis failure is non-fatal — DB layer provides the ACID guarantee.
      console.warn(
        "Redis lock failed; falling back to DB row lock & partial unique index:",
        redisError
      );
    }
  }

  // ── LAYER 2: PostgreSQL Transaction with Row Lock ───────────────────
  try {
    return await db.transaction(async (tx) => {
      // Step 2a: Lock the PRE-EXISTING slot row with NOWAIT.
      // ⚠️ We lock the `slots` row (which always exists because slots are
      // pre-populated), NOT the `appointments` row. SELECT FOR UPDATE on a
      // non-existent row acquires no lock and cannot prevent phantom inserts.
      const slotQuery = await tx.execute(
        sql`SELECT id, status FROM slots
            WHERE id = ${slotId}
              AND doctor_id = ${doctorId}
              AND slot_timestamp = ${slotTimestamp.toISOString()}
            FOR UPDATE NOWAIT`
      );

      const rows = slotQuery.rows as Array<{ id: string; status: string }>;
      if (!rows || rows.length === 0) {
        throw new SlotBookingError("SLOT_NOT_FOUND");
      }

      const currentSlot = rows[0];
      if (currentSlot.status !== "AVAILABLE") {
        throw new SlotBookingError("SLOT_UNAVAILABLE");
      }

      // Step 2b: Transition slot status to RESERVED
      await tx
        .update(slots)
        .set({ status: "RESERVED" })
        .where(eq(slots.id, currentSlot.id));

      // Step 2c: Insert appointment record
      // Protected by idx_prevent_double_booking partial unique index
      const [newAppointment] = await tx
        .insert(appointments)
        .values({
          patientId,
          doctorId,
          slotId: currentSlot.id,
          appointmentTimestamp: slotTimestamp,
          status: "PENDING",
        })
        .returning({ id: appointments.id });

      return { success: true, appointmentId: newAppointment.id };
    });
  } catch (error: unknown) {
    return handleBookingError(error);
  } finally {
    // ── LAYER 1 Cleanup: Release Redis Lock ───────────────────────────
    // Only release if WE still hold the lock (compare token).
    if (redis && lockAcquired) {
      try {
        const currentToken = await redis.get(lockKey);
        if (currentToken === lockToken) {
          await redis.del(lockKey);
        }
      } catch (releaseErr) {
        // Non-fatal — lock will auto-expire via TTL
        console.warn("Failed to release Redis lock (will auto-expire):", releaseErr);
      }
    }
  }
}

// ============================================================================
// Error Handler
// ============================================================================

function handleBookingError(error: unknown): BookingResult {
  // Our own typed error from within the transaction
  if (error instanceof SlotBookingError) {
    return { success: false, error: error.code };
  }

  const dbError = error as { code?: string; message?: string };

  // PostgreSQL error 23505: unique_violation
  // Triggered by idx_prevent_double_booking partial unique index
  if (dbError.code === "23505") {
    return { success: false, error: "CONFLICT_DOUBLE_BOOKING" };
  }

  // PostgreSQL error 55P03: lock_not_available
  // Triggered by FOR UPDATE NOWAIT when another transaction holds the row lock
  if (dbError.code === "55P03") {
    return { success: false, error: "SLOT_BUSY" };
  }

  // Fallback: check error message strings
  if (dbError.message === "SLOT_NOT_FOUND") {
    return { success: false, error: "SLOT_NOT_FOUND" };
  }
  if (dbError.message === "SLOT_UNAVAILABLE") {
    return { success: false, error: "SLOT_UNAVAILABLE" };
  }

  // Unexpected error — log and return generic
  console.error("Unexpected booking error:", error);
  return { success: false, error: "UNKNOWN_ERROR" };
}
