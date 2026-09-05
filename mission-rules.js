const { Pool } = require("pg");
const { Server } = require("socket.io");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const KINDS = new Set([
  "play_games", "win_games", "roll_dice", "move_tokens", "send_messages",
  "join_rooms", "create_rooms", "roll_sixes", "move_home", "complete_games",
]);

let readyPromise = null;
const rosterSeen = new Set();
const roomParticipants = new Map();

function day() { return new Date().toISOString().slice(0, 10); }

function setup() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ludo_mission_events(
          user_id TEXT NOT NULL,event_day DATE NOT NULL,event_id TEXT NOT NULL,
          kind TEXT NOT NULL,amount INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,event_id)
        );
        CREATE TABLE IF NOT EXISTS ludo_daily_mission_progress(
          user_id TEXT NOT NULL,mission_day DATE NOT NULL,kind TEXT NOT NULL,
          progress INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,mission_day,kind)
        );
        CREATE TABLE IF NOT EXISTS ludo_daily_missions(
          user_id TEXT NOT NULL,mission_day DATE NOT NULL,slot INTEGER NOT NULL,mission_id TEXT NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE,claimed BOOLEAN NOT NULL DEFAULT FALSE,
          claimed_at TIMESTAMPTZ,PRIMARY KEY(user_id,mission_day,slot),UNIQUE(user_id,mission_day,mission_id)
        );
        CREATE TABLE IF NOT EXISTS ludo_mission_definitions(
          id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',target INTEGER NOT NULL DEFAULT 1,
          reward_coins INTEGER NOT NULL DEFAULT 0,reward_gems INTEGER NOT NULL DEFAULT 0,kind TEXT NOT NULL DEFAULT 'play_games',
          admin_created BOOLEAN NOT NULL DEFAULT FALSE,active BOOLEAN NOT NULL DEFAULT TRUE,scheduled_date DATE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ludo_daily_mission_bonus(
          user_id TEXT NOT NULL,mission_day DATE NOT NULL,unlocked BOOLEAN NOT NULL DEFAULT FALSE,
          claimed BOOLEAN NOT NULL DEFAULT FALSE,claimed_at TIMESTAMPTZ,PRIMARY KEY(user_id,mission_day)
        );
      `);
    })();
  }
  return readyPromise;
}

async function refreshDaily(userId, missionDay) {
  const values = await pool.query(
    `SELECT kind,progress FROM ludo_daily_mission_progress WHERE user_id=$1 AND mission_day=$2`,
    [userId, missionDay],
  );
  const progress = Object.fromEntries(values.rows.map((r) => [r.kind, Number(r.progress)]));
  const assigned = await pool.query(
    `SELECT dm.mission_id,md.kind,md.target,dm.completed
       FROM ludo_daily_missions dm JOIN ludo_mission_definitions md ON md.id=dm.mission_id
      WHERE dm.user_id=$1 AND dm.mission_day=$2`,
    [userId, missionDay],
  );
  for (const m of assigned.rows) {
    if (!m.completed && Number(progress[m.kind] || 0) >= Number(m.target)) {
      await pool.query(
        `UPDATE ludo_daily_missions SET completed=TRUE WHERE user_id=$1 AND mission_day=$2 AND mission_id=$3`,
        [userId, missionDay, m.mission_id],
      );
    }
  }
  const done = await pool.query(
    `SELECT COUNT(*)::int AS n FROM ludo_daily_missions WHERE user_id=$1 AND mission_day=$2 AND completed=TRUE`,
    [userId, missionDay],
  );
  if (Number(done.rows[0]?.n || 0) >= 6) {
    await pool.query(
      `INSERT INTO ludo_daily_mission_bonus(user_id,mission_day,unlocked) VALUES($1,$2,TRUE)
       ON CONFLICT(user_id,mission_day) DO UPDATE SET unlocked=TRUE`,
      [userId, missionDay],
    );
  }
}

async function record(userId, kind, amount = 1, eventId) {
  const pid = String(userId || "").trim();
  if (!pid || !KINDS.has(kind)) return;
  const n = Math.max(1, Math.min(50, Math.trunc(Number(amount) || 1)));
  const id = String(eventId || `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 120);
  try {
    await setup();
    const d = day();
    const inserted = await pool.query(
      `INSERT INTO ludo_mission_events(user_id,event_day,event_id,kind,amount)
       VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,event_id) DO NOTHING RETURNING event_id`,
      [pid, d, id, kind, n],
    );
    if (!inserted.rowCount) return;
    await pool.query(
      `INSERT INTO ludo_daily_mission_progress(user_id,mission_day,kind,progress)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(user_id,mission_day,kind)
       DO UPDATE SET progress=ludo_daily_mission_progress.progress+EXCLUDED.progress`,
      [pid, d, kind, n],
    );
    await refreshDaily(pid, d);
  } catch (error) {
    console.error("[missions] record", error?.message || error);
  }
}

function roomCode(room) {
  if (Array.isArray(room)) return String(room[0] || "");
  return String(room || "");
}

function participantIds(code, payload) {
  const ids = Array.isArray(payload)
    ? payload.map((member) => String(member?.playerId || "").trim()).filter(Boolean)
    : [];
  if (ids.length) roomParticipants.set(code, new Set(ids));
  return roomParticipants.get(code) || new Set();
}

function observe(room, event, payload) {
  try {
    const code = roomCode(room);
    const d = day();

    if (event === "roster" && Array.isArray(payload)) {
      const participants = participantIds(code, payload);
      for (const member of payload) {
        const userId = String(member?.playerId || "").trim();
        if (!userId) continue;
        const kind = member?.host ? "create_rooms" : "join_rooms";
        const key = `${d}:${code}:${kind}:${userId}`;
        if (rosterSeen.has(key)) continue;
        rosterSeen.add(key);
        void record(userId, kind, 1, `room-${kind}-${d}-${code}-${userId}`);
      }
      if (participants.size) roomParticipants.set(code, participants);
    }

    if (event === "start-game" && Array.isArray(payload?.members)) {
      const participants = participantIds(code, payload.members);
      for (const member of payload.members) {
        const userId = String(member?.playerId || "").trim();
        if (userId) void record(userId, "play_games", 1, `play-${code}-${userId}`);
      }
      if (participants.size) roomParticipants.set(code, participants);
    }

    if (event === "game-dice") {
      const userId = String(payload?.playerId || "").trim();
      const revision = Number(payload?.stateRevision || Date.now());
      const value = Number(payload?.value || 0);
      if (userId) {
        void record(userId, "roll_dice", 1, `roll-${code}-${userId}-${revision}`);
        if (value === 6) void record(userId, "roll_sixes", 1, `six-${code}-${userId}-${revision}`);
      }
    }

    if (event === "game-moved") {
      const userId = String(payload?.playerId || "").trim();
      const revision = Number(payload?.stateRevision || Date.now());
      if (userId) {
        void record(userId, "move_tokens", 1, `move-${code}-${userId}-${revision}`);
        if (Number(payload?.target) === 57 && !payload?.captured) {
          void record(userId, "move_home", 1, `home-${code}-${userId}-${revision}`);
        }
      }
    }

    if (event === "game-state") {
      const state = payload || {};
      const winnerId = String(state?.winnerId || "").trim();
      if (state?.status === "finished" && winnerId) {
        const revision = Number(state?.stateRevision || Date.now());
        const participants = roomParticipants.get(code) || new Set([winnerId]);
        for (const userId of participants) {
          void record(userId, "complete_games", 1, `finish-${code}-${userId}-${revision}`);
        }
        void record(winnerId, "win_games", 1, `win-${code}-${winnerId}-${revision}`);
        roomParticipants.delete(code);
      }
    }
  } catch (error) {
    console.error("[missions] broadcast hook", error?.message || error);
  }
}

// Hook only the public Socket.IO Server#to API. Do not import Socket.IO's
// private dist/broadcast-operator module; that path is blocked by package
// exports in production Node versions.
if (!Server.prototype.__ludoMissionToPatched) {
  Server.prototype.__ludoMissionToPatched = true;
  const originalTo = Server.prototype.to;
  Server.prototype.to = function missionAwareTo(room, ...rest) {
    const operator = originalTo.call(this, room, ...rest);
    if (operator && !operator.__ludoMissionEmitPatched) {
      operator.__ludoMissionEmitPatched = true;
      const originalEmit = operator.emit;
      operator.emit = function missionAwareEmit(event, ...args) {
        observe(room, event, args[0]);
        return originalEmit.call(this, event, ...args);
      };
    }
    return operator;
  };
}

void setup().catch((error) => console.error("[missions] setup", error?.message || error));
module.exports = { record, observe };
