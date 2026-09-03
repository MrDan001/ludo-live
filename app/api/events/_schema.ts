import { pool, ensureAuthSchema } from "../auth/_db";

let ready: Promise<void> | null = null;

export function ensureEventsSchema() {
  if (!ready) {
    ready = (async () => {
      await ensureAuthSchema();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ludo_events (
          id TEXT PRIMARY KEY,title TEXT NOT NULL,name TEXT,description TEXT NOT NULL DEFAULT '',icon TEXT NOT NULL DEFAULT '🎉',color TEXT NOT NULL DEFAULT 'purple',
          reward TEXT NOT NULL DEFAULT '🎁',reward_coins INTEGER NOT NULL DEFAULT 0,reward_gems INTEGER NOT NULL DEFAULT 0,event_type TEXT NOT NULL DEFAULT 'challenge',
          mission_kind TEXT NOT NULL DEFAULT 'win_games',mission_target INTEGER NOT NULL DEFAULT 1 CHECK (mission_target > 0),
          modes JSONB NOT NULL DEFAULT '["bot","2p","4p","tournament"]'::jsonb,boards JSONB NOT NULL DEFAULT '["classic"]'::jsonb,
          starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ NOT NULL,status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','cancelled','ended')),
          settled_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),CHECK (ends_at > starts_at)
        );

        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '🎉';
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'purple';
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS reward TEXT NOT NULL DEFAULT '🎁';
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS reward_coins INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS reward_gems INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'challenge';
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS mission_kind TEXT NOT NULL DEFAULT 'win_games';
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS mission_target INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS modes JSONB NOT NULL DEFAULT '["bot","2p","4p","tournament"]'::jsonb;
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS boards JSONB NOT NULL DEFAULT '["classic"]'::jsonb;
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        ALTER TABLE ludo_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        UPDATE ludo_events SET title=COALESCE(NULLIF(title,''),name,'Untitled Event') WHERE title IS NULL OR title='';
        UPDATE ludo_events SET name=COALESCE(NULLIF(name,''),title,'Untitled Event') WHERE name IS NULL OR name='';
        UPDATE ludo_events SET starts_at=COALESCE(starts_at,NOW()), ends_at=COALESCE(ends_at,NOW()+INTERVAL '1 day') WHERE starts_at IS NULL OR ends_at IS NULL;
        UPDATE ludo_events SET status=COALESCE(NULLIF(status,''),'published') WHERE status IS NULL OR status='';
        ALTER TABLE ludo_events ALTER COLUMN starts_at SET DEFAULT NOW();
        ALTER TABLE ludo_events ALTER COLUMN ends_at SET DEFAULT (NOW()+INTERVAL '1 day');
        ALTER TABLE ludo_events ALTER COLUMN starts_at SET NOT NULL;
        ALTER TABLE ludo_events ALTER COLUMN ends_at SET NOT NULL;
        CREATE INDEX IF NOT EXISTS ludo_events_window_idx ON ludo_events(starts_at,ends_at);
        CREATE INDEX IF NOT EXISTS ludo_events_status_idx ON ludo_events(status);

        CREATE TABLE IF NOT EXISTS ludo_event_entries (
          event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
          joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),completed BOOLEAN NOT NULL DEFAULT FALSE,
          reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,completed_at TIMESTAMPTZ,PRIMARY KEY(event_id,user_id)
        );
        ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE ludo_event_entries ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS ludo_event_entries_user_idx ON ludo_event_entries(user_id,joined_at DESC);

        CREATE TABLE IF NOT EXISTS ludo_event_rewards (
          event_id TEXT NOT NULL REFERENCES ludo_events(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
          coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),gems INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(event_id,user_id)
        );
        ALTER TABLE ludo_event_rewards ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE ludo_event_rewards ADD COLUMN IF NOT EXISTS gems INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE ludo_event_rewards ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS ludo_event_rewards_user_idx ON ludo_event_rewards(user_id,settled_at DESC);

        INSERT INTO ludo_events(id,title,name,description,icon,color,reward,reward_coins,reward_gems,event_type,mission_kind,mission_target,modes,boards,starts_at,ends_at,status)
        SELECT * FROM (VALUES
          ('daily-domination','Daily Domination','Daily Domination','Win matches across the Ludo Live game modes.','🏆','purple','🪙 500',500,0,'challenge','win_games',3,'["bot","2p","4p"]'::jsonb,'["classic","midnight","royal","jungle","fire-ice"]'::jsonb,NOW()-INTERVAL '30 minutes',NOW()+INTERVAL '2 hours 30 minutes','published'),
          ('dice-frenzy','Dice Frenzy','Dice Frenzy','Roll, move and win before the clock runs out.','⚄','blue','💎 5',0,5,'challenge','roll_dice',20,'["bot","2p","4p"]'::jsonb,'["classic","midnight","royal","jungle","fire-ice"]'::jsonb,NOW()-INTERVAL '15 minutes',NOW()+INTERVAL '3 hours','published'),
          ('ludo-live-rush','Ludo Live Rush','Ludo Live Rush','Complete games in any supported mood and board.','🔥','purple','🪙 750',750,0,'challenge','complete_games',5,'["bot","2p","4p","tournament"]'::jsonb,'["classic","midnight","royal","jungle","fire-ice"]'::jsonb,NOW()-INTERVAL '5 minutes',NOW()+INTERVAL '4 hours','published'),
          ('midnight-masters','Midnight Masters','Midnight Masters','A scheduled night-mode challenge is opening soon.','🌙','blue','💎 10',0,10,'challenge','win_games',5,'["bot","2p","4p"]'::jsonb,'["midnight"]'::jsonb,NOW()+INTERVAL '20 minutes',NOW()+INTERVAL '2 hours 20 minutes','published'),
          ('royal-road','Royal Road','Royal Road','Prepare for a royal-board winning streak.','👑','purple','🪙 1000',1000,0,'challenge','win_games',7,'["2p","4p"]'::jsonb,'["royal"]'::jsonb,NOW()+INTERVAL '60 minutes',NOW()+INTERVAL '4 hours','published')
        ) AS seed(id,title,name,description,icon,color,reward,reward_coins,reward_gems,event_type,mission_kind,mission_target,modes,boards,starts_at,ends_at,status)
        WHERE NOT EXISTS (SELECT 1 FROM ludo_events);

        -- Safe migration: shrink only seeded-style events nobody has joined yet.
        UPDATE ludo_events e SET reward_coins=CASE e.id WHEN 'daily-domination' THEN 500 WHEN 'ludo-live-rush' THEN 750 WHEN 'royal-road' THEN 1000 ELSE e.reward_coins END,
          reward_gems=CASE e.id WHEN 'dice-frenzy' THEN 5 WHEN 'midnight-masters' THEN 10 ELSE e.reward_gems END,
          reward=CASE e.id WHEN 'daily-domination' THEN '🪙 500' WHEN 'dice-frenzy' THEN '💎 5' WHEN 'ludo-live-rush' THEN '🪙 750' WHEN 'midnight-masters' THEN '💎 10' WHEN 'royal-road' THEN '🪙 1000' ELSE e.reward END,
          updated_at=NOW()
        WHERE e.id IN ('daily-domination','dice-frenzy','ludo-live-rush','midnight-masters','royal-road')
          AND NOT EXISTS (SELECT 1 FROM ludo_event_entries x WHERE x.event_id=e.id);
      `);
    })().catch((error) => { ready = null; throw error; });
  }
  return ready;
}

export function eventState(startsAt: string | Date, endsAt: string | Date, status: string) {
  if (status === "cancelled" || status === "draft") return status;
  const now=Date.now(),start=new Date(startsAt).getTime(),end=new Date(endsAt).getTime();
  if(now<start)return "upcoming"; if(now>=end)return "expired"; return "live";
}
