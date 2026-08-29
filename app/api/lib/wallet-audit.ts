import { PoolClient } from "pg";
import { randomUUID } from "crypto";

export async function ensureWalletAudit(client: PoolClient) {
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

export async function markWalletContext(client: PoolClient, input: { source: string; sourceRef?: string; actorUserId?: string; requestId?: string; ip?: string; userAgent?: string; reason?: string }) {
  const requestId = input.requestId || randomUUID();
  await client.query(`SELECT
    set_config('ludo.wallet_source',$1,true),
    set_config('ludo.wallet_source_ref',$2,true),
    set_config('ludo.wallet_actor',$3,true),
    set_config('ludo.wallet_request_id',$4,true),
    set_config('ludo.wallet_ip',$5,true),
    set_config('ludo.wallet_user_agent',$6,true),
    set_config('ludo.wallet_reason',$7,true)`, [input.source, input.sourceRef || '', input.actorUserId || '', requestId, input.ip || '', input.userAgent || '', input.reason || '']);
  return requestId;
}
