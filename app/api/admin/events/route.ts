import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { ensureEventsSchema, eventState } from "../../events/_schema";

const COOKIE = "ludo_session";

async function admin(q: NextRequest) {
  const token = q.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`, [hash]);
  const u = r.rows[0];
  if (!u || u.is_guest || u.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  return u.email && allowed.includes(u.email.toLowerCase()) ? u : null;
}

async function audit(a: any, action: string, details: any) {
  await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,details) VALUES($1,$2,$3)`, [a.id, action, JSON.stringify(details || {})]);
}

function present(x: any) {
  return {
    id: x.id, title: x.title, description: x.description, icon: x.icon, color: x.color, reward: x.reward,
    rewardCoins: Number(x.reward_coins), rewardGems: Number(x.reward_gems), eventType: x.event_type,
    missionKind: x.mission_kind, missionTarget: Number(x.mission_target), modes: x.modes || [], boards: x.boards || [],
    startsAt: new Date(x.starts_at).toISOString(), endsAt: new Date(x.ends_at).toISOString(),
    status: x.status, state: eventState(x.starts_at, x.ends_at, x.status), createdAt: x.created_at, updatedAt: x.updated_at,
    participants: Number(x.participants || 0), completed: Number(x.completed || 0),
  };
}

function cleanDate(value: unknown) {
  const d = new Date(String(value || ""));
  if (Number.isNaN(d.getTime())) throw new Error("Invalid event date/time.");
  return d.toISOString();
}

function cleanArray(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 20);
  return fallback;
}

export async function GET(q: NextRequest) {
  try {
    await ensureAuthSchema();
    await ensureEventsSchema();
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await pool.query(`UPDATE ludo_events SET status='ended',updated_at=NOW() WHERE status='published' AND ends_at<=NOW()`);
    const r = await pool.query<any>(`SELECT e.*,COUNT(ee.user_id)::int participants,COUNT(*) FILTER (WHERE ee.completed)::int completed FROM ludo_events e LEFT JOIN ludo_event_entries ee ON ee.event_id=e.id GROUP BY e.id ORDER BY e.starts_at ASC`);
    return NextResponse.json({ events: r.rows.map(present), serverNow: new Date().toISOString() });
  } catch (e) {
    console.error("admin events GET", e);
    return NextResponse.json({ error: "Event admin unavailable." }, { status: 500 });
  }
}

export async function POST(q: NextRequest) {
  try {
    await ensureAuthSchema();
    await ensureEventsSchema();
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const b = await q.json();
    const action = String(b.action || "");

    if (action === "create" || action === "edit") {
      const id = String(b.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 48);
      const title = String(b.title || "").trim();
      const description = String(b.description || "").trim();
      const icon = String(b.icon || "🎉").trim().slice(0, 8) || "🎉";
      const color = b.color === "blue" ? "blue" : "purple";
      const rewardCoins = Math.max(0, Math.trunc(Number(b.rewardCoins || 0)));
      const rewardGems = Math.max(0, Math.trunc(Number(b.rewardGems || 0)));
      const reward = String(b.reward || (rewardCoins ? `🪙 ${rewardCoins.toLocaleString()}` : `💎 ${rewardGems}`)).trim().slice(0, 80);
      const eventType = String(b.eventType || "challenge").slice(0, 40);
      const missionKind = String(b.missionKind || "win_games").slice(0, 40);
      const missionTarget = Math.max(1, Math.trunc(Number(b.missionTarget || 1)));
      const modes = cleanArray(b.modes, ["bot", "2p", "4p"]);
      const boards = cleanArray(b.boards, ["classic"]);
      const startsAt = cleanDate(b.startsAt);
      const endsAt = cleanDate(b.endsAt);
      if (!title) return NextResponse.json({ error: "Event title is required." }, { status: 400 });
      if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
      if (action === "create") {
        await pool.query(`INSERT INTO ludo_events(id,title,name,description,icon,color,reward,reward_coins,reward_gems,event_type,mission_kind,mission_target,modes,boards,starts_at,ends_at,status) VALUES($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'published')`, [id,title,description,icon,color,reward,rewardCoins,rewardGems,eventType,missionKind,missionTarget,JSON.stringify(modes),JSON.stringify(boards),startsAt,endsAt]);
        await audit(a, "create_event", { id, title, startsAt, endsAt });
      } else {
        const r = await pool.query(`UPDATE ludo_events SET title=$1,name=$1,description=$2,icon=$3,color=$4,reward=$5,reward_coins=$6,reward_gems=$7,event_type=$8,mission_kind=$9,mission_target=$10,modes=$11,boards=$12,starts_at=$13,ends_at=$14,status=CASE WHEN status='cancelled' THEN 'published' ELSE status END,updated_at=NOW() WHERE id=$15`, [title,description,icon,color,reward,rewardCoins,rewardGems,eventType,missionKind,missionTarget,JSON.stringify(modes),JSON.stringify(boards),startsAt,endsAt,id]);
        if (!r.rowCount) return NextResponse.json({ error: "Event not found." }, { status: 404 });
        await audit(a, "edit_event", { id, title, startsAt, endsAt });
      }
      return NextResponse.json({ ok: true, id });
    }

    if (action === "set_status") {
      const id = String(b.id || "");
      const status = String(b.status || "");
      if (!["draft","published","cancelled","ended"].includes(status)) return NextResponse.json({ error: "Invalid event status." }, { status: 400 });
      const r = await pool.query(`UPDATE ludo_events SET status=$1,updated_at=NOW() WHERE id=$2`, [status, id]);
      if (!r.rowCount) return NextResponse.json({ error: "Event not found." }, { status: 404 });
      await audit(a, "event_status", { id, status });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      const id = String(b.id || "");
      const r = await pool.query(`DELETE FROM ludo_events WHERE id=$1`, [id]);
      if (!r.rowCount) return NextResponse.json({ error: "Event not found." }, { status: 404 });
      await audit(a, "delete_event", { id });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown event admin action." }, { status: 400 });
  } catch (e) {
    console.error("admin events POST", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Event admin action failed." }, { status: 500 });
  }
}
