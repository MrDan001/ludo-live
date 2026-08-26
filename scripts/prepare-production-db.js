const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) process.exit(0);

async function main() {
  const client = new Client({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ludo_users (id TEXT PRIMARY KEY, username TEXT NOT NULL, email TEXT UNIQUE, password_hash TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), coins INTEGER NOT NULL DEFAULT 1000, gems INTEGER NOT NULL DEFAULT 10, xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 0, is_guest BOOLEAN NOT NULL DEFAULT FALSE, is_banned BOOLEAN NOT NULL DEFAULT FALSE, banned_at TIMESTAMPTZ, ban_reason TEXT, last_seen_at TIMESTAMPTZ, owned_boards JSONB NOT NULL DEFAULT '["classic"]', owned_dice JSONB NOT NULL DEFAULT '["classic"]', equipped_board TEXT NOT NULL DEFAULT 'classic', equipped_dice TEXT NOT NULL DEFAULT 'classic', owned_avatars JSONB NOT NULL DEFAULT '[]', equipped_avatar TEXT NOT NULL DEFAULT 'default', owned_items JSONB NOT NULL DEFAULT '[]', equipped_items JSONB NOT NULL DEFAULT '[]');
      CREATE TABLE IF NOT EXISTS ludo_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL);
      CREATE INDEX IF NOT EXISTS ludo_sessions_user_idx ON ludo_sessions(user_id);
      CREATE INDEX IF NOT EXISTS ludo_sessions_expiry_idx ON ludo_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS ludo_push_subscriptions (id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, user_agent TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS ludo_push_subscriptions_user_idx ON ludo_push_subscriptions(user_id);
      CREATE TABLE IF NOT EXISTS ludo_events (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open', starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'), rules JSONB NOT NULL DEFAULT '{}', rewards JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS reward_coins INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS reward_gems INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS ludo_event_entries (event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE, score INTEGER NOT NULL DEFAULT 0, joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed BOOLEAN NOT NULL DEFAULT FALSE, reward_claimed BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY(event_id,user_id));
      ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN NOT NULL DEFAULT FALSE;
      CREATE TABLE IF NOT EXISTS ludo_event_rewards (event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE, coins INTEGER NOT NULL DEFAULT 0, gems INTEGER NOT NULL DEFAULT 0, settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(event_id,user_id));
      CREATE INDEX IF NOT EXISTS ludo_event_rewards_user_idx ON ludo_event_rewards(user_id, settled_at DESC);
    `);
    console.log('Production database schema prepared.');
  } finally { await client.end(); }
}
main().catch((error) => { console.error('Production DB preparation failed:', error); process.exit(1); });
