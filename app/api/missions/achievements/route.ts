import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { currentUser } from "../../../lib/auth-session";

export const dynamic = "force-dynamic";

async function setup() {
  await ensureAuthSchema();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ludo_mission_definitions(
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      target INTEGER NOT NULL DEFAULT 1,
      reward_coins INTEGER NOT NULL DEFAULT 0,
      reward_gems INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'play_games',
      admin_created BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      scheduled_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ludo_daily_missions(
      user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
      mission_day DATE NOT NULL,
      slot INTEGER NOT NULL,
      mission_id TEXT NOT NULL REFERENCES ludo_mission_definitions(id) ON DELETE CASCADE,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      claimed BOOLEAN NOT NULL DEFAULT FALSE,
      claimed_at TIMESTAMPTZ,
      PRIMARY KEY(user_id,mission_day,slot),
      UNIQUE(user_id,mission_day,mission_id)
    );
    CREATE TABLE IF NOT EXISTS ludo_daily_mission_bonus(
      user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
      mission_day DATE NOT NULL,
      unlocked BOOLEAN NOT NULL DEFAULT FALSE,
      claimed BOOLEAN NOT NULL DEFAULT FALSE,
      claimed_at TIMESTAMPTZ,
      PRIMARY KEY(user_id,mission_day)
    );
    CREATE TABLE IF NOT EXISTS ludo_daily_mission_settings(
      mission_day DATE PRIMARY KEY,
      bonus_coins INTEGER NOT NULL DEFAULT 5000,
      bonus_gems INTEGER NOT NULL DEFAULT 50,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ludo_weekly_mission_definitions(
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      target INTEGER NOT NULL DEFAULT 1,
      reward_coins INTEGER NOT NULL DEFAULT 0,
      reward_gems INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'play_games',
      difficulty TEXT NOT NULL DEFAULT 'easy',
      admin_created BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      scheduled_week DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ludo_weekly_missions(
      user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      slot INTEGER NOT NULL,
      mission_id TEXT NOT NULL REFERENCES ludo_weekly_mission_definitions(id) ON DELETE CASCADE,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      claimed BOOLEAN NOT NULL DEFAULT FALSE,
      claimed_at TIMESTAMPTZ,
      PRIMARY KEY(user_id,week_start,slot),
      UNIQUE(user_id,week_start,mission_id)
    );
    CREATE TABLE IF NOT EXISTS ludo_weekly_mission_bonus(
      user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      unlocked BOOLEAN NOT NULL DEFAULT FALSE,
      claimed BOOLEAN NOT NULL DEFAULT FALSE,
      claimed_at TIMESTAMPTZ,
      PRIMARY KEY(user_id,week_start)
    );
    CREATE TABLE IF NOT EXISTS ludo_weekly_mission_settings(
      week_start DATE PRIMARY KEY,
      bonus_coins INTEGER NOT NULL DEFAULT 50000,
      bonus_gems INTEGER NOT NULL DEFAULT 100,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function GET(q: NextRequest) {
  try {
    await setup();
    const u = await currentUser(q);
    if (!u) return NextResponse.json({ error: "Login required." }, { status: 401 });

    const result = await pool.query(`
      SELECT source, period_type, title, description, reward_coins, reward_gems, claimed_at, period_date
      FROM (
        SELECT
          'daily'::text AS source,
          'Daily'::text AS period_type,
          md.title,
          md.description,
          md.reward_coins,
          md.reward_gems,
          dm.claimed_at,
          dm.mission_day AS period_date
        FROM ludo_daily_missions dm
        JOIN ludo_mission_definitions md ON md.id = dm.mission_id
        WHERE dm.user_id = $1 AND dm.claimed = TRUE

        UNION ALL

        SELECT
          'weekly'::text AS source,
          'Weekly'::text AS period_type,
          md.title,
          md.description,
          md.reward_coins,
          md.reward_gems,
          wm.claimed_at,
          wm.week_start AS period_date
        FROM ludo_weekly_missions wm
        JOIN ludo_weekly_mission_definitions md ON md.id = wm.mission_id
        WHERE wm.user_id = $1 AND wm.claimed = TRUE

        UNION ALL

        SELECT
          'daily_bonus'::text AS source,
          'Daily bonus'::text AS period_type,
          'Daily mission completion prize'::text AS title,
          'Completed all six daily missions.'::text AS description,
          COALESCE(ds.bonus_coins, 5000),
          COALESCE(ds.bonus_gems, 50),
          db.claimed_at,
          db.mission_day AS period_date
        FROM ludo_daily_mission_bonus db
        LEFT JOIN ludo_daily_mission_settings ds ON ds.mission_day = db.mission_day
        WHERE db.user_id = $1 AND db.claimed = TRUE

        UNION ALL

        SELECT
          'weekly_bonus'::text AS source,
          'Weekly bonus'::text AS period_type,
          'Weekly mission completion prize'::text AS title,
          'Completed all ten weekly missions.'::text AS description,
          COALESCE(ws.bonus_coins, 50000),
          COALESCE(ws.bonus_gems, 100),
          wb.claimed_at,
          wb.week_start AS period_date
        FROM ludo_weekly_mission_bonus wb
        LEFT JOIN ludo_weekly_mission_settings ws ON ws.week_start = wb.week_start
        WHERE wb.user_id = $1 AND wb.claimed = TRUE
      ) history
      ORDER BY claimed_at DESC NULLS LAST, period_date DESC
    `, [u.id]);

    const totals = result.rows.reduce((acc: { coins: number; gems: number }, row: any) => {
      acc.coins += Number(row.reward_coins || 0);
      acc.gems += Number(row.reward_gems || 0);
      return acc;
    }, { coins: 0, gems: 0 });

    return NextResponse.json({ achievements: result.rows, totals });
  } catch (e) {
    console.error("mission achievements GET", e);
    return NextResponse.json({ error: "Mission achievement service unavailable." }, { status: 500 });
  }
}
