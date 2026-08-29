import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";

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

async function ensureWalletAudit(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ludo_wallet_audit (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
      currency TEXT NOT NULL CHECK(currency IN ('coins','gems')),
      amount BIGINT NOT NULL,
      balance_before BIGINT NOT NULL,
      balance_after BIGINT NOT NULL,
      source TEXT NOT NULL DEFAULT 'unknown', source_ref TEXT,
      actor_user_id TEXT REFERENCES ludo_users(id) ON DELETE SET NULL,
      request_id TEXT, ip_address TEXT, user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'verified', reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ludo_wallet_audit_user_idx ON ludo_wallet_audit(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS ludo_wallet_audit_created_idx ON ludo_wallet_audit(created_at DESC);
    CREATE INDEX IF NOT EXISTS ludo_wallet_audit_status_idx ON ludo_wallet_audit(status, created_at DESC);
    CREATE OR REPLACE FUNCTION ludo_capture_wallet_change() RETURNS trigger AS $$
    DECLARE c TEXT; old_balance BIGINT; new_balance BIGINT; src TEXT; ref TEXT; actor TEXT; req TEXT; ip TEXT; ua TEXT; stat TEXT; why TEXT;
    BEGIN
      FOREACH c IN ARRAY ARRAY['coins','gems'] LOOP
        old_balance := COALESCE((to_jsonb(OLD)->>c)::BIGINT,0); new_balance := COALESCE((to_jsonb(NEW)->>c)::BIGINT,0);
        IF old_balance <> new_balance THEN
          src := COALESCE(NULLIF(current_setting('ludo.wallet_source',true),''),'unknown');
          ref := NULLIF(current_setting('ludo.wallet_source_ref',true),''); actor := NULLIF(current_setting('ludo.wallet_actor',true),''); req := NULLIF(current_setting('ludo.wallet_request_id',true),'');
          ip := NULLIF(current_setting('ludo.wallet_ip',true),''); ua := NULLIF(current_setting('ludo.wallet_user_agent',true),''); why := NULLIF(current_setting('ludo.wallet_reason',true),'');
          stat := CASE WHEN src='unknown' THEN 'review' ELSE 'verified' END;
          INSERT INTO ludo_wallet_audit(user_id,currency,amount,balance_before,balance_after,source,source_ref,actor_user_id,request_id,ip_address,user_agent,status,reason)
          VALUES(NEW.id,c,new_balance-old_balance,old_balance,new_balance,src,ref,actor,req,ip,ua,stat,why);
        END IF;
      END LOOP; RETURN NEW;
    END; $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS ludo_wallet_audit_trigger ON ludo_users;
    CREATE TRIGGER ludo_wallet_audit_trigger AFTER UPDATE OF coins,gems ON ludo_users FOR EACH ROW EXECUTE FUNCTION ludo_capture_wallet_change();
  `);
}

export async function POST(q: NextRequest) {
  let client: any = null;
  try {
    await ensureAuthSchema();
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    client = await pool.connect();
    await client.query("BEGIN");
    await ensureWalletAudit(client);
    const b = await q.json();
    const uid = String(b.playerId || b.userId || "").trim();
    const currency = b.currency === "gems" ? "gems" : b.currency === "coins" ? "coins" : "";
    const amount = Math.trunc(Number(b.amount));
    const reason = String(b.reason || `Admin ${amount > 0 ? "gift" : "adjustment"}`).trim().slice(0,500);
    if (!uid || !currency || !Number.isSafeInteger(amount) || amount === 0) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Player, currency and a non-zero amount are required." }, { status: 400 }); }
    const r = await client.query<any>(`SELECT id,coins,gems FROM ludo_users WHERE id=$1 FOR UPDATE`, [uid]);
    if (!r.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Player not found." }, { status: 404 }); }
    const before = Number(r.rows[0][currency]); const after = before + amount;
    if (!Number.isSafeInteger(after) || after < 0) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Balance cannot go below zero or exceed the supported limit." }, { status: 400 }); }
    const requestId = randomUUID();
    const ip = q.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || q.headers.get("x-real-ip") || "";
    const ua = q.headers.get("user-agent") || "";
    await client.query(`SELECT set_config('ludo.wallet_source','admin',true),set_config('ludo.wallet_source_ref',$1,true),set_config('ludo.wallet_actor',$2,true),set_config('ludo.wallet_request_id',$3,true),set_config('ludo.wallet_ip',$4,true),set_config('ludo.wallet_user_agent',$5,true),set_config('ludo.wallet_reason',$6,true)`, [`admin:${requestId}`, String(a.id), requestId, ip, ua, reason]);
    await client.query(`UPDATE ludo_users SET ${currency}=$1 WHERE id=$2`, [after, uid]);
    await client.query(`INSERT INTO ludo_admin_ledger(user_id,admin_user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,$2,$3,$4,$5,$6,$7,'admin')`, [uid,a.id,currency,amount,before,after,reason]);
    await client.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,target_user_id,details) VALUES($1,'balance_adjustment',$2,$3)`, [a.id,uid,JSON.stringify({currency,amount,before,after,reason,requestId,ip})]);
    await client.query("COMMIT"); client.release(); client=null;
    return NextResponse.json({ ok:true, playerId:uid, currency, amount, balance:after, requestId });
  } catch (e) {
    if (client) { try { await client.query("ROLLBACK"); } catch {} client.release(); }
    console.error(e); return NextResponse.json({ error:"Wallet update failed." }, { status:500 });
  }
}
