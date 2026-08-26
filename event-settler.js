const { Pool } = require('pg');

function databaseConnectionString() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
  // pg connection-string parameters can override the explicit `ssl` option.
  // Railway may provide sslmode=require/verify-full in DATABASE_URL, which can
  // force certificate-chain validation and produce SELF_SIGNED_CERT_IN_CHAIN.
  // Remove only sslmode so our explicit Railway-safe TLS policy below wins.
  return raw.replace(/([?&])sslmode=[^&]*&?/i, (match, prefix) => prefix === '?' ? '?' : '').replace(/[?&]$/, '');
}

const databaseSslDisabled = String(process.env.DATABASE_SSL || '').toLowerCase() === 'false';
const pool = new Pool({
  connectionString: databaseConnectionString(),
  ssl: databaseSslDisabled ? false : { rejectUnauthorized: false },
});
let running = false;

async function ensure() {
  await pool.query(`
    ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS ludo_event_rewards (
      event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
      coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
      gems INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),
      settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(event_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS ludo_event_rewards_user_idx ON ludo_event_rewards(user_id, settled_at DESC);
  `);
}

async function settleExpiredEvents() {
  if (running) return;
  running = true;
  try {
    await ensure();
    const events = await pool.query(`SELECT * FROM ludo_events WHERE status='published' AND ends_at<=NOW() FOR UPDATE SKIP LOCKED`);
    for (const event of events.rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`UPDATE ludo_events SET status='ended',updated_at=NOW() WHERE id=$1 AND status='published'`, [event.id]);
        const entries = await client.query(`SELECT user_id FROM ludo_event_entries WHERE event_id=$1 AND completed=TRUE`, [event.id]);
        for (const entry of entries.rows) {
          const inserted = await client.query(
            `INSERT INTO ludo_event_rewards(event_id,user_id,coins,gems) VALUES($1,$2,$3,$4) ON CONFLICT(event_id,user_id) DO NOTHING RETURNING event_id`,
            [event.id, entry.user_id, Number(event.reward_coins) || 0, Number(event.reward_gems) || 0]
          );
          if (inserted.rowCount) {
            await client.query(`UPDATE ludo_users SET coins=coins+$1,gems=gems+$2 WHERE id=$3`, [Number(event.reward_coins) || 0, Number(event.reward_gems) || 0, entry.user_id]);
            await client.query(`UPDATE ludo_event_entries SET reward_claimed=TRUE WHERE event_id=$1 AND user_id=$2`, [event.id, entry.user_id]);
          }
        }
        await client.query(`UPDATE ludo_events SET settled_at=NOW(),updated_at=NOW() WHERE id=$1`, [event.id]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('event settlement', event.id, error);
      } finally {
        client.release();
      }
    }
  } catch (error) {
    console.error('event settlement worker', error);
  } finally {
    running = false;
  }
}

void settleExpiredEvents();
setInterval(settleExpiredEvents, 30_000).unref();

module.exports = { settleExpiredEvents };
