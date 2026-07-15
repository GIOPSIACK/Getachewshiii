import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;
// Supabase "Transaction" pooler uses port 6543 and ?pgbouncer=true.
// In that mode Postgres prepared statements must be disabled.
const usesPooler =
  /[?&]pgbouncer=true/.test(connectionString) ||
  connectionString.includes(":6543");

export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  ...(usesPooler ? { prepare: false } : {}),
});

export const db = drizzle(pool, { schema });

export * from "./schema";
