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
    `).then(() => undefined);
  }
  return promise;
}
