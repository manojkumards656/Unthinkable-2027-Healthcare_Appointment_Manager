import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// ⚠️ CRITICAL: Use Pool (WebSocket driver) — NOT the HTTP neon() function.
// The HTTP driver does NOT support interactive transactions or SELECT FOR UPDATE,
// which are required by the booking engine for concurrency control.
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/healthcare_platform?sslmode=require";

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

// Re-export schema for convenience
export { schema };
