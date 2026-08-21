import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../auth/_db";

const COOKIE = "ludo_session";
async function userId(request: NextRequest){
  const token=request.cookies.get(COOKIE)?.value;
  if(!token) return null;
  const hash=createHash("sha256").update(token).digest("hex");
  const r=await pool.query<{id:string}>("SELECT u.id FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1",[hash]);
  return r.rows[0]?.id??null;
}
function dayKey(){const d=new Date();return d.toISOString().slice(0,10)}
const rewards=[1000,1500,5,2000,10,3000,5000];
export async function GET(request:NextRequest){
 try{await ensureAuthSchema();const id=await userId(request);if(!id)return NextResponse.json({error:"Sign in to view your rewards."},{status:401});
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_daily_rewards(user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,last_claim_date DATE,streak INTEGER NOT NULL DEFAULT 0)`);
  const r=await pool.query("SELECT last_claim_date,streak FROM ludo_daily_rewards WHERE user_id=$1",[id]);
  const row=r.rows[0];const today=dayKey();const claimed=!!row?.last_claim_date&&new Date(row.last_claim_date).toISOString().slice(0,10)===today;
  return NextResponse.json({claimed,streak:row?.streak??0,days:rewards});
 }catch(e){console.error(e);return NextResponse.json({error:"Rewards unavailable."},{status:500})}
}
export async function POST(request:NextRequest){
 try{await ensureAuthSchema();const id=await userId(request);if(!id)return NextResponse.json({error:"Sign in to claim your reward."},{status:401});
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_daily_rewards(user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,last_claim_date DATE,streak INTEGER NOT NULL DEFAULT 0)`);
  const today=dayKey();const r=await pool.query("SELECT last_claim_date,streak FROM ludo_daily_rewards WHERE user_id=$1 FOR UPDATE",[id]);const row=r.rows[0];
  if(row?.last_claim_date&&new Date(row.last_claim_date).toISOString().slice(0,10)===today)return NextResponse.json({error:"Daily reward already claimed."},{status:409});
  const previous=row?.last_claim_date?new Date(row.last_claim_date).getTime():0;const yesterday=Date.now()-86400000;const streak=row&&previous>=yesterday-3600000?Math.min(7,(row.streak||0)+1):1;const day=streak===7?7:streak;const amount=rewards[day-1];
  await pool.query("INSERT INTO ludo_daily_rewards(user_id,last_claim_date,streak) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET last_claim_date=EXCLUDED.last_claim_date,streak=EXCLUDED.streak",[id,today,streak]);
  await pool.query("UPDATE ludo_users SET coins=coins+$2 WHERE id=$1",[id,amount]);
  return NextResponse.json({claimed:true,streak,amount,kind:"coins"});
 }catch(e){console.error(e);return NextResponse.json({error:"Could not claim reward."},{status:500})}
}
