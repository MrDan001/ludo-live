import {NextRequest} from "next/server";
import {createHash} from "crypto";
import {pool,ensureAuthSchema} from "../app/api/auth/_db";

const SESSION_COOKIE="ludo_session";
const IDLE_MINUTES=30;
const ABSOLUTE_HOURS=12;
const tokenHash=(t:string)=>createHash("sha256").update(t).digest("hex");

/** Server-authoritative authentication check with idle + absolute expiry. */
export async function currentUser(q:NextRequest){
  await ensureAuthSchema();
  const t=q.cookies.get(SESSION_COOKIE)?.value;
  if(!t)return null;

  const hash=tokenHash(t);
  const r=await pool.query<any>(`
    SELECT u.*
    FROM ludo_users u
    JOIN ludo_sessions s ON s.user_id=u.id
    WHERE s.token_hash=$1
      AND u.is_banned=FALSE
      AND s.expires_at>NOW()
      AND COALESCE(s.last_activity_at,s.created_at)>NOW()-INTERVAL '${IDLE_MINUTES} minutes'
      AND COALESCE(s.absolute_expires_at,s.created_at + INTERVAL '${ABSOLUTE_HOURS} hours')>NOW()
    LIMIT 1
  `,[hash]);

  const user=r.rows[0];
  if(!user){
    await pool.query("DELETE FROM ludo_sessions WHERE token_hash=$1 OR expires_at<=NOW() OR last_activity_at<=NOW()-INTERVAL '30 minutes' OR (absolute_expires_at IS NOT NULL AND absolute_expires_at<=NOW())",[hash]).catch(()=>{});
    return null;
  }

  // Extend only the idle window; the absolute expiry remains a hard ceiling.
  await pool.query("UPDATE ludo_sessions SET last_activity_at=NOW(),expires_at=LEAST(COALESCE(absolute_expires_at,expires_at),NOW()+INTERVAL '30 minutes') WHERE token_hash=$1",[hash]).catch(()=>{});
  return user;
}
