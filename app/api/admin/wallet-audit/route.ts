import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../auth/_db";

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

async function ensureWalletAuditSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ludo_wallet_audit (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
      currency TEXT NOT NULL CHECK(currency IN ('coins','gems')),
      amount BIGINT NOT NULL,
      balance_before BIGINT NOT NULL,
      balance_after BIGINT NOT NULL,
      source TEXT NOT NULL DEFAULT 'unknown',
      source_ref TEXT,
      actor_user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
      request_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'verified',
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ludo_wallet_audit_user_idx ON ludo_wallet_audit(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS ludo_wallet_audit_created_idx ON ludo_wallet_audit(created_at DESC);
    CREATE INDEX IF NOT EXISTS ludo_wallet_audit_status_idx ON ludo_wallet_audit(status, created_at DESC);

    CREATE OR REPLACE FUNCTION ludo_capture_wallet_change() RETURNS trigger AS $$
    DECLARE
      c TEXT;
      old_balance BIGINT;
      new_balance BIGINT;
      src TEXT;
      ref TEXT;
      actor TEXT;
      req TEXT;
      ip TEXT;
      ua TEXT;
      stat TEXT;
    BEGIN
      FOREACH c IN ARRAY ARRAY['coins','gems'] LOOP
        old_balance := COALESCE((to_jsonb(OLD)->>c)::BIGINT, 0);
        new_balance := COALESCE((to_jsonb(NEW)->>c)::BIGINT, 0);
        IF old_balance <> new_balance THEN
          src := COALESCE(NULLIF(current_setting('ludo.wallet_source', true), ''), 'unknown');
          ref := NULLIF(current_setting('ludo.wallet_source_ref', true), '');
          actor := NULLIF(current_setting('ludo.wallet_actor', true), '');
          req := NULLIF(current_setting('ludo.wallet_request_id', true), '');
          ip := NULLIF(current_setting('ludo.wallet_ip', true), '');
          ua := NULLIF(current_setting('ludo.wallet_user_agent', true), '');
          stat := CASE WHEN src='unknown' THEN 'review' ELSE 'verified' END;
          INSERT INTO ludo_wallet_audit(user_id,currency,amount,balance_before,balance_after,source,source_ref,actor_user_id,request_id,ip_address,user_agent,status)
          VALUES(NEW.id,c,new_balance-old_balance,old_balance,new_balance,src,ref,actor,req,ip,ua,stat);
        END IF;
      END LOOP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS ludo_wallet_audit_trigger ON ludo_users;
    CREATE TRIGGER ludo_wallet_audit_trigger AFTER UPDATE OF coins, gems ON ludo_users FOR EACH ROW EXECUTE FUNCTION ludo_capture_wallet_change();
  `);
}

export async function GET(q: NextRequest) {
  try {
    await ensureAuthSchema();
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureWalletAuditSchema();
    const url = new URL(q.url);
    const userId = url.searchParams.get("userId");
    const limit = Math.min(500, Math.max(25, Number(url.searchParams.get("limit") || 200)));
    const params: any[] = [];
    let where = "";
    if (userId) { params.push(userId); where = `WHERE w.user_id=$${params.length}`; }
    params.push(limit);
    const events = await pool.query<any>(`SELECT w.*,u.username,u.email,au.username AS actor_username FROM ludo_wallet_audit w LEFT JOIN ludo_users u ON u.id=w.user_id LEFT JOIN ludo_users au ON au.id=w.actor_user_id ${where} ORDER BY w.created_at DESC LIMIT $${params.length}`, params);
    const suspicious = await pool.query<any>(`SELECT w.*,u.username,u.email FROM ludo_wallet_audit w LEFT JOIN ludo_users u ON u.id=w.user_id WHERE w.status IN ('review','blocked') ORDER BY w.created_at DESC LIMIT 200`);
    return NextResponse.json({ ok:true, events:events.rows, suspicious:suspicious.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error:"Wallet audit service unavailable." }, { status:500 });
  }
}
