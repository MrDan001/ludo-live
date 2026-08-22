import { Pool } from "pg";

const globalForDb=globalThis as unknown as {ludoPool?:Pool};
function databaseConfig(){
 const raw=process.env.DATABASE_URL;if(!raw)throw new Error("DATABASE_URL is not configured");let connectionString=raw;
 try{const u=new URL(raw);u.searchParams.delete("sslmode");u.searchParams.delete("sslcert");u.searchParams.delete("sslkey");u.searchParams.delete("sslrootcert");connectionString=u.toString()}catch{}
 return {connectionString,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:false};
}
export const pool=globalForDb.ludoPool??new Pool(databaseConfig());if(!globalForDb.ludoPool)globalForDb.ludoPool=pool;
let schemaPromise:Promise<void>|null=null;
export function ensureAuthSchema(){if(!schemaPromise){schemaPromise=pool.query(`
CREATE TABLE IF NOT EXISTS ludo_users(id TEXT PRIMARY KEY,username TEXT NOT NULL,email TEXT UNIQUE,password_hash TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),coins INTEGER NOT NULL DEFAULT 1000,gems INTEGER NOT NULL DEFAULT 10,xp INTEGER NOT NULL DEFAULT 0,level INTEGER NOT NULL DEFAULT 0,is_guest BOOLEAN NOT NULL DEFAULT FALSE,is_banned BOOLEAN NOT NULL DEFAULT FALSE,banned_at TIMESTAMPTZ,ban_reason TEXT,last_seen_at TIMESTAMPTZ);
ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS ban_reason TEXT;ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS owned_boards JSONB NOT NULL DEFAULT '["classic"]'::jsonb;ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS owned_dice JSONB NOT NULL DEFAULT '["classic"]'::jsonb;ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS equipped_board TEXT NOT NULL DEFAULT 'classic';ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS equipped_dice TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS owned_avatars JSONB NOT NULL DEFAULT '[]'::jsonb;ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS equipped_avatar TEXT NOT NULL DEFAULT 'default';ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS owned_items JSONB NOT NULL DEFAULT '[]'::jsonb;ALTER TABLE ludo_users ADD COLUMN IF NOT EXISTS equipped_items JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE IF NOT EXISTS ludo_banned_emails(email TEXT PRIMARY KEY,reason TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),admin_user_id TEXT);
CREATE TABLE IF NOT EXISTS ludo_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ NOT NULL);CREATE INDEX IF NOT EXISTS ludo_sessions_user_idx ON ludo_sessions(user_id);CREATE INDEX IF NOT EXISTS ludo_sessions_expiry_idx ON ludo_sessions(expires_at);
CREATE TABLE IF NOT EXISTS ludo_admin_ledger(id BIGSERIAL PRIMARY KEY,user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,admin_user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,currency TEXT NOT NULL CHECK(currency IN ('coins','gems')),amount INTEGER NOT NULL,balance_before INTEGER NOT NULL,balance_after INTEGER NOT NULL,reason TEXT NOT NULL,source TEXT NOT NULL DEFAULT 'admin',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());CREATE INDEX IF NOT EXISTS ludo_admin_ledger_user_idx ON ludo_admin_ledger(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS ludo_daily_visits(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,visit_date DATE NOT NULL,PRIMARY KEY(user_id,visit_date));
CREATE TABLE IF NOT EXISTS ludo_admin_actions(id BIGSERIAL PRIMARY KEY,admin_user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,action TEXT NOT NULL,target_user_id TEXT,details JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());CREATE INDEX IF NOT EXISTS ludo_admin_actions_created_idx ON ludo_admin_actions(created_at DESC);
CREATE TABLE IF NOT EXISTS ludo_disputes(id BIGSERIAL PRIMARY KEY,user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,title TEXT NOT NULL,description TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',admin_note TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),resolved_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS ludo_shop_payments(reference TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,package_id TEXT NOT NULL,gems INTEGER NOT NULL,amount_kobo INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),credited_at TIMESTAMPTZ);
`).then(()=>undefined)}return schemaPromise}
