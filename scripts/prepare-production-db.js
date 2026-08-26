const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('DATABASE_URL not configured; skipping production DB preparation.');
  process.exit(0);
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  try {
    // Load the application's existing schema initializer without starting Next.js.
    // This keeps first-time Railway databases compatible with the code's schema contract.
    await client.query(`CREATE TABLE IF NOT EXISTS ludo_users(id TEXT PRIMARY KEY,username TEXT NOT NULL,email TEXT UNIQUE,password_hash TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),coins INTEGER NOT NULL DEFAULT 1000,gems INTEGER NOT NULL DEFAULT 10,xp INTEGER NOT NULL DEFAULT 0,level INTEGER NOT NULL DEFAULT 0,is_guest BOOLEAN NOT NULL DEFAULT FALSE,is_banned BOOLEAN NOT NULL DEFAULT FALSE,banned_at TIMESTAMPTZ,ban_reason TEXT,last_seen_at TIMESTAMPTZ,owned_boards JSONB NOT NULL DEFAULT '["classic"]'::jsonb,owned_dice JSONB NOT NULL DEFAULT '["classic"]'::jsonb,equipped_board TEXT NOT NULL DEFAULT 'classic',equipped_dice TEXT NOT NULL DEFAULT 'classic',owned_avatars JSONB NOT NULL DEFAULT '[]'::jsonb,equipped_avatar TEXT NOT NULL DEFAULT 'default',owned_items JSONB NOT NULL DEFAULT '[]'::jsonb,equipped_items JSONB NOT NULL DEFAULT '[]'::jsonb);
CREATE TABLE IF NOT EXISTS ludo_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ NOT NULL);
CREATE INDEX IF NOT EXISTS ludo_sessions_user_idx ON ludo_sessions(user_id);
CREATE INDEX IF NOT EXISTS ludo_sessions_expiry_idx ON ludo_sessions(expires_at);
CREATE TABLE IF NOT EXISTS ludo_push_subscriptions(id BIGSERIAL PRIMARY KEY,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,endpoint TEXT NOT NULL UNIQUE,p256dh TEXT NOT NULL,auth TEXT NOT NULL,user_agent TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS ludo_push_subscriptions_user_idx ON ludo_push_subscriptions(user_id);
CREATE TABLE IF NOT EXISTS ludo_events(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'open',starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '7 days'),rules JSONB NOT NULL DEFAULT '{}'::jsonb,rewards JSONB NOT NULL DEFAULT '[]'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS ludo_event_entries(event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,score INTEGER NOT NULL DEFAULT 0,joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(event_id,user_id));
CREATE TABLE IF NOT EXISTS ludo_event_rewards(id BIGSERIAL PRIMARY KEY,event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,place INTEGER NOT NULL,reward JSONB NOT NULL DEFAULT '{}'::jsonb,awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(event_id,user_id,place));
  `);
    console.log('Production database schema prepared.');
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error('Production DB preparation failed:', error); process.exit(1); });
