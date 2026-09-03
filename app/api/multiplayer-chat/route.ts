import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth-session";
import { pool, ensureAuthSchema } from "../auth/_db";

let schemaPromise: Promise<void> | null = null;

function ensureChatSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await ensureAuthSchema();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ludo_multiplayer_chat_messages(
          id BIGSERIAL PRIMARY KEY,
          room_code TEXT NOT NULL,
          user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
          username TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ludo_multiplayer_chat_room_idx
          ON ludo_multiplayer_chat_messages(room_code, created_at ASC);
      `);
    })();
  }
  return schemaPromise;
}

function roomCodeFrom(request: NextRequest) {
  return String(request.nextUrl.searchParams.get("roomCode") || "")
    .trim()
    .toUpperCase()
    .slice(0, 64);
}

export async function GET(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roomCode = roomCodeFrom(request);
  if (!roomCode) return NextResponse.json({ messages: [] });

  try {
    await ensureChatSchema();
    const result = await pool.query(
      `SELECT id, username AS name, message AS text, EXTRACT(EPOCH FROM created_at) * 1000 AS at
       FROM ludo_multiplayer_chat_messages
       WHERE room_code = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [roomCode]
    );

    return NextResponse.json({
      messages: result.rows.reverse().map((row: any) => ({
        id: String(row.id),
        name: String(row.name || "Player"),
        text: String(row.text || ""),
        at: Math.round(Number(row.at) || Date.now()),
      })),
    });
  } catch (error) {
    console.error("multiplayer chat history", error);
    return NextResponse.json({ error: "Unable to load chat history" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const roomCode = String(body?.roomCode || "")
    .trim()
    .toUpperCase()
    .slice(0, 64);
  const text = String(body?.text || "").trim().slice(0, 240);
  if (!roomCode || !text) return NextResponse.json({ error: "Room code and message are required" }, { status: 400 });

  try {
    await ensureChatSchema();
    const username = String(user.username || "Player").slice(0, 24) || "Player";
    const result = await pool.query(
      `INSERT INTO ludo_multiplayer_chat_messages(room_code,user_id,username,message)
       VALUES($1,$2,$3,$4)
       RETURNING id, username AS name, message AS text, EXTRACT(EPOCH FROM created_at) * 1000 AS at`,
      [roomCode, String(user.id), username, text]
    );

    const row = result.rows[0];
    return NextResponse.json({
      message: {
        id: String(row.id),
        name: String(row.name || username),
        text: String(row.text || text),
        at: Math.round(Number(row.at) || Date.now()),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("multiplayer chat write", error);
    return NextResponse.json({ error: "Unable to save chat message" }, { status: 500 });
  }
}
