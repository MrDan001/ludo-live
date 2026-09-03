import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

let pool: Pool | null = null;
function db() {
  if (!pool) {
    const raw = process.env.DATABASE_URL;
    if (!raw) throw new Error("DATABASE_URL is not configured");
    let connectionString = raw;
    try {
      const u = new URL(connectionString);
      u.searchParams.delete("sslmode");
      u.searchParams.delete("sslcert");
      u.searchParams.delete("sslkey");
      u.searchParams.delete("sslrootcert");
      connectionString = u.toString();
    } catch {}
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 3,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
    });
  }
  return pool;
}

function codeOf(value: unknown) {
  return String(value || "").trim().toUpperCase().slice(0, 32);
}

export async function GET(req: NextRequest) {
  const code = codeOf(new URL(req.url).searchParams.get("roomCode"));
  if (!code) return NextResponse.json({ error: "Room code is required." }, { status: 400 });
  try {
    const result = await db().query(`
      SELECT b.id,b.room_code,b.mode_players,b.stake_per_player,b.pot,b.status,b.winner_id,b.created_at,b.started_at,b.settled_at,
             COUNT(p.user_id)::int AS staked_players,
             COALESCE(SUM(p.stake),0)::bigint AS staked_amount
      FROM ludo_multiplayer_match_bets b
      LEFT JOIN ludo_multiplayer_match_bet_players p ON p.bet_id=b.id
      WHERE b.room_code=$1
      GROUP BY b.id
      LIMIT 1`, [code]);
    if (!result.rowCount) {
      return NextResponse.json({ roomCode: code, stakePerPlayer: 0, pot: 0, stakedAmount: 0, stakedPlayers: 0, roomSize: 0, status: "open" });
    }
    const row = result.rows[0];
    return NextResponse.json({
      betId: String(row.id),
      roomCode: code,
      roomSize: Number(row.mode_players) || 2,
      stakePerPlayer: Number(row.stake_per_player) || 0,
      pot: Number(row.pot) || 0,
      stakedAmount: Number(row.staked_amount) || 0,
      stakedPlayers: Number(row.staked_players) || 0,
      status: String(row.status || "open"),
      winnerId: row.winner_id ? String(row.winner_id) : null,
      createdAt: row.created_at,
      startedAt: row.started_at,
      settledAt: row.settled_at,
    });
  } catch (error) {
    console.error("multiplayer stake status", error);
    return NextResponse.json({ error: "Unable to read multiplayer stake status." }, { status: 500 });
  }
}
