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
function dayKey(){return new Date().toISOString().slice(0,10)}
function dateValue(value:unknown){return value?new Date(String(value)+"T00:00:00.000Z"):null}
function dayDiff(a:Date,b:Date){return Math.round((a.getTime()-b.getTime())/86400000)}
const rewards=[1000,1500,5,2000,10,3000,5000];
const schema=`CREATE TABLE IF NOT EXISTS ludo_daily_rewards(user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,last_claim_date DATE,streak INTEGER NOT NULL DEFAULT 0,claimed_days INTEGER[] NOT NULL DEFAULT '{}')`;
async function ensureRewardSchema(){
  await pool.query(schema);
  await pool.query("ALTER TABLE ludo_daily_rewards ADD COLUMN IF NOT EXISTS claimed_days INTEGER[] NOT NULL DEFAULT '{}' ");
}
export async function GET(request:NextRequest){
 try{
  await ensureAuthSchema();const id=await userId(request);if(!id)return NextResponse.json({error:"Sign in to view your rewards."},{status:401});
  await ensureRewardSchema();
  const r=await pool.query("SELECT last_claim_date,streak,claimed_days FROM ludo_daily_rewards WHERE user_id=$1",[id]);
  let row=r.rows[0];const today=dayKey();const todayDate=new Date(today+"T00:00:00.000Z");
  if(row?.last_claim_date){
   const last=dateValue(row.last_claim_date)!;
   if(dayDiff(todayDate,last)>1){
    await pool.query("UPDATE ludo_daily_rewards SET streak=0,claimed_days='{}' WHERE user_id=$1",[id]);
    row={...row,streak:0,claimed_days:[]};
   }
  }
  const claimed=!!row?.last_claim_date&&new Date(String(row.last_claim_date)+"T00:00:00.000Z").toISOString().slice(0,10)===today;
  return NextResponse.json({claimed,streak:row?.streak??0,claimedDays:row?.claimed_days??[],days:rewards});
 }catch(e){console.error(e);return NextResponse.json({error:"Rewards unavailable."},{status:500})}
}
export async function POST(request:NextRequest){
 try{
  await ensureAuthSchema();const id=await userId(request);if(!id)return NextResponse.json({error:"Sign in to claim your reward."},{status:401});
  await ensureRewardSchema();
  const today=dayKey();const todayDate=new Date(today+"T00:00:00.000Z");
  const r=await pool.query("SELECT last_claim_date,streak,claimed_days FROM ludo_daily_rewards WHERE user_id=$1 FOR UPDATE",[id]);const row=r.rows[0];
  if(row?.last_claim_date&&new Date(String(row.last_claim_date)+"T00:00:00.000Z").toISOString().slice(0,10)===today)return NextResponse.json({error:"Daily reward already claimed."},{status:409});
  let streak=1;let claimedDays:number[]=[];
  if(row?.last_claim_date){
   const last=dateValue(row.last_claim_date)!;const diff=dayDiff(todayDate,last);
   if(diff===1 && (row.streak||0)<7){streak=(row.streak||0)+1;claimedDays=Array.isArray(row.claimed_days)?row.claimed_days:[];}
   else if(diff===1 && (row.streak||0)>=7){streak=1;claimedDays=[];}
   else {streak=1;claimedDays=[];}
  }
  const day=streak;const amount=rewards[day-1];claimedDays=Array.from(new Set([...claimedDays,day]));
  await pool.query("INSERT INTO ludo_daily_rewards(user_id,last_claim_date,streak,claimed_days) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET last_claim_date=EXCLUDED.last_claim_date,streak=EXCLUDED.streak,claimed_days=EXCLUDED.claimed_days",[id,today,streak,claimedDays]);
  await pool.query("UPDATE ludo_users SET coins=coins+$2 WHERE id=$1",[id,amount]);
  return NextResponse.json({claimed:true,streak,amount,kind:"coins",claimedDays});
 }catch(e){console.error(e);return NextResponse.json({error:"Could not claim reward."},{status:500})}
}
