import { pool } from "../auth/_db";

let promise: Promise<void> | null = null;

export function ensureTournamentV2Schema() {
  if (!promise) {
    promise = pool.query(`
      ALTER TABLE ludo_tournaments ADD COLUMN IF NOT EXISTS prize_multiplier NUMERIC(8,4) NOT NULL DEFAULT 0.20;
      ALTER TABLE ludo_tournaments ADD COLUMN IF NOT EXISTS participation_reward_coins INTEGER NOT NULL DEFAULT 100;
      ALTER TABLE ludo_tournaments ADD COLUMN IF NOT EXISTS participation_reward_gems INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE ludo_tournaments ADD COLUMN IF NOT EXISTS join_cutoff_days INTEGER NOT NULL DEFAULT 2;
      ALTER TABLE ludo_tournaments ADD COLUMN IF NOT EXISTS funding_reserved_coins BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE ludo_tournaments ADD COLUMN IF NOT EXISTS funding_reserved_gems BIGINT NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS ludo_tournament_entry_payments (
        id BIGSERIAL PRIMARY KEY,
        tournament_id TEXT NOT NULL REFERENCES ludo_tournaments(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
        coins BIGINT NOT NULL DEFAULT 0,
        gems BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tournament_id,user_id)
      );

      CREATE TABLE IF NOT EXISTS ludo_tournament_player_stats (
        tournament_id TEXT NOT NULL REFERENCES ludo_tournaments(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
        points INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        eligible BOOLEAN NOT NULL DEFAULT FALSE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        score_reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY(tournament_id,user_id)
      );
      CREATE INDEX IF NOT EXISTS ludo_tournament_player_stats_rank_idx ON ludo_tournament_player_stats(tournament_id,points DESC,score_reached_at ASC);

      CREATE TABLE IF NOT EXISTS ludo_tournament_board_sessions (
        id BIGSERIAL PRIMARY KEY,
        tournament_id TEXT NOT NULL REFERENCES ludo_tournaments(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
        board_token TEXT NOT NULL UNIQUE,
        state JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished','forfeited','cancelled')),
        wins_recorded INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tournament_id,user_id)
      );

      CREATE TABLE IF NOT EXISTS ludo_tournament_badges (
        id BIGSERIAL PRIMARY KEY,
        tournament_id TEXT NOT NULL REFERENCES ludo_tournaments(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
        badge_type TEXT NOT NULL CHECK(badge_type IN ('participation','top10','gold','silver','bronze')),
        badge_key TEXT NOT NULL UNIQUE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tournament_id,user_id,badge_type)
      );

      -- Safe migration: only shrink the old 1,000-coin participation reward on
      -- open tournaments that nobody has entered yet. Never rewrite a live/entered bracket.
      UPDATE ludo_tournaments t
      SET participation_reward_coins=100
      WHERE t.status='open'
        AND t.participation_reward_coins=1000
        AND NOT EXISTS (SELECT 1 FROM ludo_tournament_entries e WHERE e.tournament_id=t.id);

      -- Scarcity migration for the original seeded tournaments. Only touch an
      -- untouched open tournament; entered/live brackets are never rewritten.
      UPDATE ludo_tournaments t
      SET prize_pool_coins = CASE t.id
          WHEN 'grand-championship' THEN 10000
          WHEN 'blitz-arena' THEN 6000
          WHEN 'midnight-cup' THEN 4000
          WHEN 'royal-rumble' THEN 12000
          WHEN 'jungle-quest' THEN 3000
          WHEN 'fire-ice' THEN 8000
          WHEN 'rookie-road' THEN 2000
          WHEN 'weekend-legends' THEN 8000
          WHEN 'ludo-live-finals' THEN 20000
          ELSE t.prize_pool_coins END,
          prize_pool_gems = CASE t.id
          WHEN 'grand-championship' THEN 50
          WHEN 'blitz-arena' THEN 30
          WHEN 'gem-masters' THEN 100
          WHEN 'midnight-cup' THEN 20
          WHEN 'royal-rumble' THEN 60
          WHEN 'jungle-quest' THEN 15
          WHEN 'fire-ice' THEN 40
          WHEN 'rookie-road' THEN 10
          WHEN 'weekend-legends' THEN 40
          WHEN 'ludo-live-finals' THEN 200
          ELSE t.prize_pool_gems END,
          entry_fee_coins = CASE t.id
          WHEN 'grand-championship' THEN 500
          WHEN 'blitz-arena' THEN 250
          WHEN 'midnight-cup' THEN 200
          WHEN 'royal-rumble' THEN 750
          WHEN 'jungle-quest' THEN 150
          WHEN 'fire-ice' THEN 350
          WHEN 'rookie-road' THEN 50
          WHEN 'weekend-legends' THEN 500
          WHEN 'ludo-live-finals' THEN 1000
          ELSE t.entry_fee_coins END,
          entry_fee_gems = CASE t.id
          WHEN 'gem-masters' THEN 20
          WHEN 'ludo-live-finals' THEN 20
          ELSE t.entry_fee_gems END,
          prizes = CASE t.id
          WHEN 'grand-championship' THEN '[{"place":1,"coins":5000,"gems":25},{"place":2,"coins":3000,"gems":15},{"place":3,"coins":2000,"gems":10}]'::jsonb
          WHEN 'blitz-arena' THEN '[{"place":1,"coins":3000,"gems":15},{"place":2,"coins":1800,"gems":9},{"place":3,"coins":1200,"gems":6}]'::jsonb
          WHEN 'gem-masters' THEN '[{"place":1,"gems":50},{"place":2,"gems":30},{"place":3,"gems":20}]'::jsonb
          WHEN 'midnight-cup' THEN '[{"place":1,"coins":2000,"gems":10},{"place":2,"coins":1200,"gems":6},{"place":3,"coins":800,"gems":4}]'::jsonb
          WHEN 'royal-rumble' THEN '[{"place":1,"coins":6000,"gems":30},{"place":2,"coins":3600,"gems":18},{"place":3,"coins":2400,"gems":12}]'::jsonb
          WHEN 'jungle-quest' THEN '[{"place":1,"coins":1500,"gems":8},{"place":2,"coins":900,"gems":4},{"place":3,"coins":600,"gems":3}]'::jsonb
          WHEN 'fire-ice' THEN '[{"place":1,"coins":4000,"gems":20},{"place":2,"coins":2400,"gems":12},{"place":3,"coins":1600,"gems":8}]'::jsonb
          WHEN 'rookie-road' THEN '[{"place":1,"coins":1000,"gems":5},{"place":2,"coins":600,"gems":3},{"place":3,"coins":400,"gems":2}]'::jsonb
          WHEN 'weekend-legends' THEN '[{"place":1,"coins":4000,"gems":20},{"place":2,"coins":2400,"gems":12},{"place":3,"coins":1600,"gems":8}]'::jsonb
          WHEN 'ludo-live-finals' THEN '[{"place":1,"coins":10000,"gems":100},{"place":2,"coins":6000,"gems":60},{"place":3,"coins":4000,"gems":40}]'::jsonb
          ELSE t.prizes END
      WHERE t.status='open'
        AND t.id IN ('grand-championship','blitz-arena','gem-masters','midnight-cup','royal-rumble','jungle-quest','fire-ice','rookie-road','weekend-legends','ludo-live-finals')
        AND NOT EXISTS (SELECT 1 FROM ludo_tournament_entries e WHERE e.tournament_id=t.id);
    `).then(() => undefined);
  }
  return promise;
}
