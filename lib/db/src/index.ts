import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ?? "";
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
