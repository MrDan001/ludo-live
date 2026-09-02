const { Pool } = require('pg');
const { randomUUID } = require('crypto');

function databaseConnectionString() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
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
            const requestId = randomUUID();
            const sourceRef = `event:${event.id}:user:${entry.user_id}`;
            await client.query(`SELECT set_config('ludo.wallet_source','event_settlement',true),set_config('ludo.wallet_source_ref',$1,true),set_config('ludo.wallet_actor','',true),set_config('ludo.wallet_actor_type','system',true),set_config('ludo.wallet_request_id',$2,true),set_config('ludo.wallet_ip','',true),set_config('ludo.wallet_user_agent','event-settler',true),set_config('ludo.wallet_reason',$3,true)`, [sourceRef, requestId, `Event reward settlement: ${event.id}`]);
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

    const tournamentSecret = process.env.TOURNAMENT_SETTLE_SECRET || '';
    if (tournamentSecret) {
      const tournaments = await pool.query(`SELECT id FROM ludo_tournaments WHERE status NOT IN ('finished','cancelled','draft') AND ends_at<=NOW() ORDER BY ends_at ASC LIMIT 20`);
      const port = Number(process.env.PORT || 3000);
      for (const tournament of tournaments.rows) {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/api/tournaments/settle`, {
            method: 'POST',
            headers: {'content-type':'application/json','x-tournament-settle-secret':tournamentSecret},
            body: JSON.stringify({tournamentId:String(tournament.id)}),
          });
          if (!response.ok) console.error('tournament settlement', tournament.id, response.status, await response.text().catch(()=>''));
        } catch (error) {
          console.error('tournament settlement worker', tournament.id, error);
        }
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
