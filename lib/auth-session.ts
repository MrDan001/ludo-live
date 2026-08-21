import {NextRequest} from "next/server";import {createHash} from "crypto";import {pool,ensureAuthSchema} from "../app/api/auth/_db";
const SESSION_COOKIE="ludo_session";const tokenHash=(t:string)=>createHash("sha256").update(t).digest("hex");
export async function currentUser(q:NextRequest){await ensureAuthSchema();const t=q.cookies.get(SESSION_COOKIE)?.value;if(!t)return null;const r=await pool.query<any>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`,[tokenHash(t)]);return r.rows[0]??null}
