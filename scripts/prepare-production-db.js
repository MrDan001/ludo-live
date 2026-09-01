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
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '🎉';
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'purple';
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS reward TEXT NOT NULL DEFAULT '🎁';
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'challenge';
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS mission_kind TEXT NOT NULL DEFAULT 'win_games';
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS mission_target INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS modes JSONB NOT NULL DEFAULT '["bot","2p","4p","tournament"]'::jsonb;
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS boards JSONB NOT NULL DEFAULT '["classic"]'::jsonb;
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS reward_coins INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS reward_gems INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS ludo_event_entries (event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE, score INTEGER NOT NULL DEFAULT 0, joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed BOOLEAN NOT NULL DEFAULT FALSE, reward_claimed BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY(event_id,user_id));
      ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
      ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN NOT NULL DEFAULT FALSE;
      CREATE TABLE IF NOT EXISTS ludo_event_rewards (event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE, coins INTEGER NOT NULL DEFAULT 0, gems INTEGER NOT NULL DEFAULT 0, settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(event_id,user_id));
      ALTER TABLE ludo_event_rewards ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      ALTER TABLE ludo_event_rewards ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE ludo_event_rewards ADD COLUMN IF NOT EXISTS gems INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS ludo_events_window_idx ON ludo_events(starts_at, ends_at);
      CREATE INDEX IF NOT EXISTS ludo_events_status_idx ON ludo_events(status);
      CREATE INDEX IF NOT EXISTS ludo_event_entries_user_idx ON ludo_event_entries(user_id, joined_at DESC);
      CREATE INDEX IF NOT EXISTS ludo_event_rewards_user_idx ON ludo_event_rewards(user_id, settled_at DESC);
      CREATE TABLE IF NOT EXISTS ludo_xp_events (user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE, event_key TEXT NOT NULL, amount INTEGER NOT NULL, source TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id,event_key));
    `);

    const duplicateCheck = await client.query(`
      SELECT user_id, event_key, COUNT(*)::int AS duplicate_count
      FROM ludo_xp_events
      GROUP BY user_id, event_key
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 20
    `);
    if (duplicateCheck.rowCount) {
      throw new Error(`SAFE MIGRATION ABORTED: ludo_xp_events contains duplicate (user_id,event_key) records: ${JSON.stringify(duplicateCheck.rows)}`);
    }

    const existingConstraints = await client.query(`
      SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      WHERE c.conrelid = 'ludo_xp_events'::regclass
      ORDER BY c.conname
    `);

    for (const row of existingConstraints.rows) {
      const def = String(row.constraint_def || '').replace(/\s+/g, ' ').trim();
      if ((row.contype === 'p' || row.contype === 'u') && /^PRIMARY KEY \(event_key\)$/i.test(def) || row.contype === 'u' && /^UNIQUE \(event_key\)$/i.test(def)) {
        await client.query(`ALTER TABLE ludo_xp_events DROP CONSTRAINT ${JSON.stringify(row.conname)}`);
      }
    }

    const composite = await client.query(`
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'ludo_xp_events'::regclass
        AND contype IN ('p','u')
        AND regexp_replace(pg_get_constraintdef(oid), '\\s+', ' ', 'g') ~* '^(PRIMARY KEY|UNIQUE) \\(user_id, event_key\\)$'
      LIMIT 1
    `);
    if (!composite.rowCount) {
      await client.query(`ALTER TABLE ludo_xp_events ADD CONSTRAINT ludo_xp_events_user_event_key_unique UNIQUE (user_id,event_key)`);
    }

    const constraints = await client.query(`SELECT conname, contype, pg_get_constraintdef(oid) AS constraint_def FROM pg_constraint WHERE conrelid = 'ludo_xp_events'::regclass ORDER BY conname`);
    console.log('LIVE ludo_xp_events CONSTRAINTS:', JSON.stringify(constraints.rows));
    console.log('Production database schema prepared.');
  } finally { await client.end(); }
}
main().catch((error) => { console.error('Production DB preparation failed:', error); process.exit(1); });
