import { pool, ensureAuthSchema } from "../auth/_db";

let ready: Promise<void> | null = null;

export function ensureEventsSchema() {
  if (!ready) {
    ready = (async () => {
      await ensureAuthSchema();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ludo_events (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          icon TEXT NOT NULL DEFAULT '🎉',
          color TEXT NOT NULL DEFAULT 'purple',
          reward TEXT NOT NULL DEFAULT '🎁',
          reward_coins INTEGER NOT NULL DEFAULT 0,
          reward_gems INTEGER NOT NULL DEFAULT 0,
          event_type TEXT NOT NULL DEFAULT 'challenge',
          mission_kind TEXT NOT NULL DEFAULT 'win_games',
          mission_target INTEGER NOT NULL DEFAULT 1 CHECK (mission_target > 0),
          modes JSONB NOT NULL DEFAULT '["bot","2p","4p","tournament"]'::jsonb,
          boards JSONB NOT NULL DEFAULT '["classic"]'::jsonb,
          starts_at TIMESTAMPTZ NOT NULL,
          ends_at TIMESTAMPTZ NOT NULL,
          status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','cancelled','ended')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CHECK (ends_at > starts_at)
        );
        CREATE INDEX IF NOT EXISTS ludo_events_window_idx ON ludo_events(starts_at, ends_at);
        CREATE INDEX IF NOT EXISTS ludo_events_status_idx ON ludo_events(status);

        CREATE TABLE IF NOT EXISTS ludo_event_entries (
          event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
          joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
          completed_at TIMESTAMPTZ,
          PRIMARY KEY(event_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS ludo_event_entries_user_idx ON ludo_event_entries(user_id, joined_at DESC);

        INSERT INTO ludo_events(id,title,description,icon,color,reward,reward_coins,reward_gems,event_type,mission_kind,mission_target,modes,boards,starts_at,ends_at,status)
        SELECT * FROM (VALUES
          ('daily-domination','Daily Domination','Win matches across the Ludo Live game modes.','🏆','purple','🪙 2,500',2500,0,'challenge','win_games',3,'["bot","2p","4p"]'::jsonb,'["classic","midnight","royal","jungle","fire-ice"]'::jsonb,NOW()-INTERVAL '30 minutes',NOW()+INTERVAL '2 hours 30 minutes','published'),
          ('dice-frenzy','Dice Frenzy','Roll, move and win before the clock runs out.','⚄','blue','💎 25',0,25,'challenge','roll_dice',20,'["bot","2p","4p"]'::jsonb,'["classic","midnight","royal","jungle","fire-ice"]'::jsonb,NOW()-INTERVAL '15 minutes',NOW()+INTERVAL '3 hours','published'),
          ('ludo-live-rush','Ludo Live Rush','Complete games in any supported mood and board.','🔥','purple','🪙 5,000',5000,0,'challenge','complete_games',5,'["bot","2p","4p","tournament"]'::jsonb,'["classic","midnight","royal","jungle","fire-ice"]'::jsonb,NOW()-INTERVAL '5 minutes',NOW()+INTERVAL '4 hours','published'),
          ('midnight-masters','Midnight Masters','A scheduled night-mode challenge is opening soon.','🌙','blue','💎 50',0,50,'challenge','win_games',5,'["bot","2p","4p"]'::jsonb,'["midnight"]'::jsonb,NOW()+INTERVAL '20 minutes',NOW()+INTERVAL '2 hours 20 minutes','published'),
          ('royal-road','Royal Road','Prepare for a royal-board winning streak.','👑','purple','🪙 7,500',7500,0,'challenge','win_games',7,'["2p","4p"]'::jsonb,'["royal"]'::jsonb,NOW()+INTERVAL '60 minutes',NOW()+INTERVAL '4 hours','published')
        ) AS seed(id,title,description,icon,color,reward,reward_coins,reward_gems,event_type,mission_kind,mission_target,modes,boards,starts_at,ends_at,status)
        WHERE NOT EXISTS (SELECT 1 FROM ludo_events)
      `);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export function eventState(startsAt: string | Date, endsAt: string | Date, status: string) {
  if (status === "cancelled" || status === "draft") return status;
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (now < start) return "upcoming";
  if (now >= end) return "expired";
  return "live";
}
