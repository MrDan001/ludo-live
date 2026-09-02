import {NextRequest} from "next/server";
import {createHash} from "crypto";
import {pool,ensureAuthSchema} from "../app/api/auth/_db";

const SESSION_COOKIE="ludo_session";
const IDLE_MINUTES=30;
const ABSOLUTE_HOURS=12;
const tokenHash=(t:string)=>createHash("sha256").update(t).digest("hex");

/**
 * Server-authoritative authentication check.
 * A cookie is never treated as proof of identity by itself: the hashed token
 * must match a live DB session, the user must not be banned, the session must
 * be within its absolute lifetime, and it must not be idle for too long.
 */
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
      AND (
        s.absolute_expires_at IS NULL
        OR s.absolute_expires_at>NOW()
        OR s.created_at + INTERVAL '${ABSOLUTE_HOURS} hours'>NOW()
      )
    LIMIT 1
  `,[hash]);

  const user=r.rows[0];
  if(!user){
    // Remove expired/idle sessions so a stolen/old token cannot be reused.
    await pool.query("DELETE FROM ludo_sessions WHERE token_hash=$1 OR expires_at<=NOW() OR last_activity_at<=NOW()-INTERVAL '30 minutes'",[hash]).catch(()=>{});
    return null;
  }

  // Sliding idle timeout, bounded by the absolute session lifetime.
  await pool.query("UPDATE ludo_sessions SET last_activity_at=NOW(),expires_at=LEAST(expires_at,NOW()+INTERVAL '30 minutes') WHERE token_hash=$1",[hash]).catch(()=>{});
  return user;
}
