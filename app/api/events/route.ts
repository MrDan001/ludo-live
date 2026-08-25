import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool } from "../auth/_db";
import { ensureEventsSchema, eventState } from "./_schema";

const COOKIE = "ludo_session";

async function currentUser(q: NextRequest) {
  const token = q.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>(
    `SELECT u.id,u.username,u.email,u.is_guest,u.is_banned
     FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id
     WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`,
    [hash]
  );
  const u = r.rows[0];
  return u && !u.is_guest && !u.is_banned ? u : null;
}

async function expireEvents() {
  await pool.query(`UPDATE ludo_events SET status='ended',updated_at=NOW() WHERE status='published' AND ends_at<=NOW()`);
}

function present(row: any, joined = false) {
  const state = eventState(row.starts_at, row.ends_at, row.status);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    color: row.color,
    reward: row.reward,
    rewardCoins: Number(row.reward_coins),
    rewardGems: Number(row.reward_gems),
    eventType: row.event_type,
    missionKind: row.mission_kind,
    missionTarget: Number(row.mission_target),
    modes: row.modes || [],
    boards: row.boards || [],
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    state,
    joined,
    progress: Number(row.progress || 0),
    completed: Boolean(row.completed),
  };
}

export async function GET(q: NextRequest) {
  try {
    await ensureEventsSchema();
    await expireEvents();
    const u = await currentUser(q);
    const r = await pool.query<any>(
      `SELECT e.*,ee.user_id IS NOT NULL AS joined,COALESCE(ee.progress,0) progress,COALESCE(ee.completed,FALSE) completed
       FROM ludo_events e
       LEFT JOIN ludo_event_entries ee ON ee.event_id=e.id AND ee.user_id=$1
       WHERE e.status<>'draft' AND e.status<>'cancelled'
       ORDER BY e.starts_at ASC`,
      [u?.id || null]
    );
    const events = r.rows.map((x: any) => present(x, Boolean(x.joined)));
    return NextResponse.json({ events, serverNow: new Date().toISOString() });
  } catch (e) {
    console.error("events GET", e);
    return NextResponse.json({ error: "Events service unavailable." }, { status: 500 });
  }
}

export async function POST(q: NextRequest) {
  try {
    await ensureEventsSchema();
    const u = await currentUser(q);
    if (!u) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const b = await q.json();
    const action = String(b.action || "");

    if (action === "join") {
      const id = String(b.eventId || "");
      const r = await pool.query<any>(`SELECT * FROM ludo_events WHERE id=$1 LIMIT 1`, [id]);
      if (!r.rowCount) return NextResponse.json({ error: "Event not found." }, { status: 404 });
      const e = r.rows[0];
      const state = eventState(e.starts_at, e.ends_at, e.status);
      if (state !== "live") return NextResponse.json({ error: state === "upcoming" ? "This event is not live yet." : "This event has expired." }, { status: 409 });
      await pool.query(`INSERT INTO ludo_event_entries(event_id,user_id) VALUES($1,$2) ON CONFLICT(event_id,user_id) DO NOTHING`, [id, u.id]);
      return NextResponse.json({ ok: true, eventId: id });
    }

    if (action === "activity") {
      const kind = String(b.kind || "");
      const amount = Math.max(1, Math.min(100, Math.trunc(Number(b.amount || 1))));
      if (!kind) return NextResponse.json({ error: "Activity kind required." }, { status: 400 });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const r = await client.query<any>(
          `SELECT e.id,e.mission_target,e.mission_kind,e.starts_at,e.ends_at,e.status,ee.progress,ee.completed
           FROM ludo_event_entries ee JOIN ludo_events e ON e.id=ee.event_id
           WHERE ee.user_id=$1 AND e.status='published' AND e.starts_at<=NOW() AND e.ends_at>NOW() AND ee.completed=FALSE
             AND e.mission_kind=$2 FOR UPDATE`,
          [u.id, kind]
        );
        for (const e of r.rows) {
          const next = Math.min(Number(e.mission_target), Number(e.progress) + amount);
          const completed = next >= Number(e.mission_target);
          await client.query(
            `UPDATE ludo_event_entries SET progress=$1,completed=$2,completed_at=CASE WHEN $2 THEN NOW() ELSE completed_at END WHERE event_id=$3 AND user_id=$4`,
            [next, completed, e.id, u.id]
          );
        }
        await client.query("COMMIT");
        return NextResponse.json({ ok: true, updated: r.rowCount });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ error: "Unknown event action." }, { status: 400 });
  } catch (e) {
    console.error("events POST", e);
    return NextResponse.json({ error: "Event action failed." }, { status: 500 });
  }
}
