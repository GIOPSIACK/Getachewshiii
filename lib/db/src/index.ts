import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
// Supabase "Transaction" pooler uses port 6543 and ?pgbouncer=true.
// In that mode Postgres prepared statements must be disabled.
const usesPooler =
  Boolean(connectionString) &&
  (/[?&]pgbouncer=true/.test(connectionString) ||
    connectionString.includes(":6543"));

export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  ...(usesPooler ? { prepare: false } : {}),
  ...(usesPooler ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool, { schema });

export * from "./schema";
