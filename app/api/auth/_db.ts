import { Pool } from "pg";

const globalForDb = globalThis as unknown as { ludoPool?: Pool };
export const pool = globalForDb.ludoPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
if (!globalForDb.ludoPool) globalForDb.ludoPool = pool;

let schemaPromise: Promise<void> | null = null;
export function ensureAuthSchema(){
  if(!schemaPromise){
    schemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS ludo_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        coins INTEGER NOT NULL DEFAULT 1000,
        gems INTEGER NOT NULL DEFAULT 10,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 0,
        is_guest BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE TABLE IF NOT EXISTS ludo_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ludo_sessions_user_idx ON ludo_sessions(user_id);
      CREATE INDEX IF NOT EXISTS ludo_sessions_expiry_idx ON ludo_sessions(expires_at);
    `).then(()=>undefined);
  }
  return schemaPromise;
}
