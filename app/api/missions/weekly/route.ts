import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { currentUser } from "../../../lib/auth-session";
import { createHash } from "crypto";

type Kind="play_games"|"win_games"|"roll_dice"|"move_tokens"|"send_messages"|"join_rooms"|"create_rooms"|"roll_sixes"|"move_home"|"complete_games";
type Difficulty="easy"|"hard"|"very_hard";
type Seed={id:string;title:string;description:string;target:number;kind:Kind;difficulty:Difficulty;rewardCoins:number;rewardGems:number};

const templates=[
 ["Play {n} Ludo games","Play {n} Ludo games this week.","play_games",[5,8,12,18,25]],
 ["Win {n} Ludo games","Win {n} Ludo games this week.","win_games",[2,3,5,8,12]],
 ["Roll {n} dice times","Make {n} dice rolls this week.","roll_dice",[25,40,60,100,200]],
 ["Make {n} token moves","Make {n} legal token moves this week.","move_tokens",[20,35,50,90,200]],
 ["Send {n} room messages","Send {n} messages in Ludo rooms this week.","send_messages",[10,20,30,50,100]],
 ["Join {n} online rooms","Join {n} online Ludo rooms this week.","join_rooms",[3,5,8,10,20]],
 ["Create {n} game rooms","Create {n} Ludo game rooms this week.","create_rooms",[2,3,5,6,12]],
 ["Roll {n} sixes","Roll a 6 {n} times this week.","roll_sixes",[3,5,7,10,20]],
 ["Bring {n} tokens home","Bring {n} tokens all the way home this week.","move_home",[5,8,10,16,25]],
 ["Finish {n} Ludo games","Finish {n} Ludo games this week.","complete_games",[2,3,5,8,12]]
] as const;
const CATALOG:Seed[]=templates.flatMap((t,i)=>t[3].map((target,j)=>({id:`weekly-${i*5+j+1}`,title:t[0].replace("{n}",String(target)),description:t[1].replace("{n}",String(target)),target,kind:t[2] as Kind,difficulty:(j<3?"easy":j===3?"hard":"very_hard") as Difficulty,rewardCoins:[5000,6500,8000,14000,22000][j],rewardGems:[5,10,10,20,30][j]})));
const DEFAULT_BONUS={coins:50000,gems:100};
const weekStart=()=>{const d=new Date();const day=d.getUTCDay();d.setUTCDate(d.getUTCDate()+(day===0?-6:1-day));return d.toISOString().slice(0,10)};
const weekEnd=(start:string)=>{const d=new Date(`${start}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+7);return d.toISOString().slice(0,10)};
const hash=(s:string)=>parseInt(createHash("sha256").update(s).digest("hex").slice(0,8),16);

async function setup(){
 await ensureAuthSchema();
 await pool.query(`CREATE TABLE IF NOT EXISTS ludo_weekly_mission_definitions(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',target INTEGER NOT NULL DEFAULT 1,reward_coins INTEGER NOT NULL DEFAULT 0,reward_gems INTEGER NOT NULL DEFAULT 0,kind TEXT NOT NULL DEFAULT 'play_games',difficulty TEXT NOT NULL DEFAULT 'easy',admin_created BOOLEAN NOT NULL DEFAULT FALSE,active BOOLEAN NOT NULL DEFAULT TRUE,scheduled_week DATE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());CREATE TABLE IF NOT EXISTS ludo_weekly_missions(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,week_start DATE NOT NULL,slot INTEGER NOT NULL,mission_id TEXT NOT NULL REFERENCES ludo_weekly_mission_definitions(id) ON DELETE CASCADE,completed BOOLEAN NOT NULL DEFAULT FALSE,claimed BOOLEAN NOT NULL DEFAULT FALSE,claimed_at TIMESTAMPTZ,PRIMARY KEY(user_id,week_start,slot),UNIQUE(user_id,week_start,mission_id));CREATE TABLE IF NOT EXISTS ludo_weekly_assignment_bundles(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,week_start DATE NOT NULL,signature TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,week_start),UNIQUE(week_start,signature));CREATE TABLE IF NOT EXISTS ludo_weekly_mission_bonus(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,week_start DATE NOT NULL,unlocked BOOLEAN NOT NULL DEFAULT FALSE,claimed BOOLEAN NOT NULL DEFAULT FALSE,claimed_at TIMESTAMPTZ,PRIMARY KEY(user_id,week_start));CREATE TABLE IF NOT EXISTS ludo_weekly_mission_settings(week_start DATE PRIMARY KEY,bonus_coins INTEGER NOT NULL DEFAULT 50000,bonus_gems INTEGER NOT NULL DEFAULT 100,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
 await pool.query(`INSERT INTO ludo_weekly_mission_definitions(id,title,description,target,reward_coins,reward_gems,kind,difficulty) SELECT id,title,description,target,rewardCoins,rewardGems,kind,difficulty FROM jsonb_to_recordset($1::jsonb) AS x(id text,title text,description text,target integer,rewardCoins integer,rewardGems integer,kind text,difficulty text) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,target=EXCLUDED.target,reward_coins=EXCLUDED.reward_coins,reward_gems=EXCLUDED.reward_gems,kind=EXCLUDED.kind,difficulty=EXCLUDED.difficulty WHERE ludo_weekly_mission_definitions.admin_created=FALSE`,[JSON.stringify(CATALOG)]);
 await pool.query(`UPDATE ludo_weekly_mission_definitions SET reward_coins=0,reward_gems=0 WHERE reward_coins IS NULL OR reward_gems IS NULL`);
}
async function getBonus(week:string){const r=await pool.query(`SELECT bonus_coins,bonus_gems FROM ludo_weekly_mission_settings WHERE week_start=$1`,[week]);return r.rows[0]?{coins:Number(r.rows[0].bonus_coins),gems:Number(r.rows[0].bonus_gems)}:DEFAULT_BONUS;}
async function progressFor(uid:string,start:string){const r=await pool.query(`SELECT kind,COALESCE(SUM(amount),0)::int AS progress FROM ludo_mission_events WHERE user_id=$1 AND event_day >= $2 AND event_day < $3 GROUP BY kind`,[uid,start,weekEnd(start)]);return Object.fromEntries(r.rows.map((x:any)=>[x.kind,Number(x.progress)]));}
async function assign(uid:string){
 const week=weekStart();
 const existing=await pool.query(`SELECT wm.slot,wm.mission_id,wm.completed,wm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.difficulty,md.admin_created FROM ludo_weekly_missions wm JOIN ludo_weekly_mission_definitions md ON md.id=wm.mission_id WHERE wm.user_id=$1 AND wm.week_start=$2 ORDER BY wm.slot`,[uid,week]);
 if((existing.rowCount||0)>=10)return existing.rows.slice(0,10);
 const selected:any[]=[];const used=new Set<string>();
 const admin=await pool.query(`SELECT * FROM ludo_weekly_mission_definitions WHERE active=TRUE AND admin_created=TRUE AND scheduled_week=$1 ORDER BY created_at ASC`,[week]);
 for(const difficulty of ["easy","hard","very_hard"] as Difficulty[]){
  const need=difficulty==="easy"?5:difficulty==="hard"?3:2;
  for(const row of admin.rows.filter((x:any)=>x.difficulty===difficulty)){
   if(selected.filter(x=>x.difficulty===difficulty).length>=need)break;
   if(used.has(row.id))continue;
   selected.push({id:row.id,title:row.title,description:row.description,target:Number(row.target),kind:row.kind as Kind,difficulty,rewardCoins:Number(row.reward_coins),rewardGems:Number(row.reward_gems)});
   used.add(row.id);
  }
 }
 for(const difficulty of ["easy","hard","very_hard"] as Difficulty[]){
  const need=difficulty==="easy"?5:difficulty==="hard"?3:2;
  const poolRows=CATALOG.filter(x=>x.difficulty===difficulty);
  const start=hash(`${uid}:${week}:${difficulty}`)%poolRows.length;
  for(let i=0;selected.filter(x=>x.difficulty===difficulty).length<need&&i<poolRows.length*3;i++){
   const c=poolRows[(start+i)%poolRows.length];
   if(!used.has(c.id)){selected.push(c);used.add(c.id);}
  }
 }
 let ordered=selected.slice(0,10);let signature=ordered.map(x=>x.id).sort().join(",");
 for(let salt=0;salt<100;salt++){
  const ok=await pool.query(`INSERT INTO ludo_weekly_assignment_bundles(user_id,week_start,signature) VALUES($1,$2,$3) ON CONFLICT(week_start,signature) DO NOTHING RETURNING signature`,[uid,week,signature]);
  if(ok.rowCount)break;
  ordered=[];
  for(const difficulty of ["easy","hard","very_hard"] as Difficulty[]){
   const need=difficulty==="easy"?5:difficulty==="hard"?3:2;
   const poolRows=CATALOG.filter(x=>x.difficulty===difficulty);const start=(hash(`${uid}:${week}:${difficulty}`)+salt+1)%poolRows.length;
   for(let i=0,n=0;n<need&&i<poolRows.length*2;i++){const c=poolRows[(start+i)%poolRows.length];if(!ordered.some(x=>x.id===c.id)){ordered.push(c);n++;}}
  }
  signature=ordered.map(x=>x.id).sort().join(",");
 }
 const existingIds=new Set(existing.rows.map((x:any)=>x.mission_id));let slot=1;
 for(const m of ordered){if(existingIds.has(m.id))continue;await pool.query(`INSERT INTO ludo_weekly_missions(user_id,week_start,slot,mission_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[uid,week,slot++,m.id]);if(slot>10)break;}
 return (await pool.query(`SELECT wm.slot,wm.mission_id,wm.completed,wm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.difficulty,md.admin_created FROM ludo_weekly_missions wm JOIN ludo_weekly_mission_definitions md ON md.id=wm.mission_id WHERE wm.user_id=$1 AND wm.week_start=$2 ORDER BY wm.slot`,[uid,week])).rows.slice(0,10);
}
async function refreshCompletion(uid:string,week:string){const p=await progressFor(uid,week);const rows=await pool.query(`SELECT wm.mission_id,wm.completed,md.kind,md.target FROM ludo_weekly_missions wm JOIN ludo_weekly_mission_definitions md ON md.id=wm.mission_id WHERE wm.user_id=$1 AND wm.week_start=$2`,[uid,week]);for(const m of rows.rows)if(!m.completed&&Number(p[m.kind]||0)>=Number(m.target))await pool.query(`UPDATE ludo_weekly_missions SET completed=TRUE WHERE user_id=$1 AND week_start=$2 AND mission_id=$3`,[uid,week,m.mission_id]);const done=await pool.query(`SELECT COUNT(*)::int n FROM ludo_weekly_missions WHERE user_id=$1 AND week_start=$2 AND completed=TRUE`,[uid,week]);if(Number(done.rows[0]?.n||0)>=10)await pool.query(`INSERT INTO ludo_weekly_mission_bonus(user_id,week_start,unlocked) VALUES($1,$2,TRUE) ON CONFLICT(user_id,week_start) DO UPDATE SET unlocked=TRUE`,[uid,week]);}
export async function GET(q:NextRequest){try{await setup();const u=await currentUser(q);if(!u)return NextResponse.json({error:"Login required."},{status:401});const week=weekStart();await assign(u.id);await refreshCompletion(u.id,week);const missions=await pool.query(`SELECT wm.slot,wm.mission_id,wm.completed,wm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.difficulty,md.admin_created FROM ludo_weekly_missions wm JOIN ludo_weekly_mission_definitions md ON md.id=wm.mission_id WHERE wm.user_id=$1 AND wm.week_start=$2 ORDER BY wm.slot`,[u.id,week]);const bonus=await pool.query(`SELECT unlocked,claimed FROM ludo_weekly_mission_bonus WHERE user_id=$1 AND week_start=$2`,[u.id,week]);return NextResponse.json({weekStart:week,missions:missions.rows.slice(0,10),progress:await progressFor(u.id,week),bonus:bonus.rows[0]||{unlocked:false,claimed:false},weeklyBonus:await getBonus(week)});}catch(e){console.error(e);return NextResponse.json({error:"Weekly mission service unavailable."},{status:500});}}
export async function POST(q:NextRequest){try{await setup();const u=await currentUser(q);if(!u)return NextResponse.json({error:"Login required."},{status:401});const b=await q.json();const action=String(b.action||"");const week=weekStart();
 if(action==="claim"){const id=String(b.missionId||"");const client=await pool.connect();try{await client.query("BEGIN");const r=await client.query(`SELECT wm.*,md.reward_coins,md.reward_gems FROM ludo_weekly_missions wm JOIN ludo_weekly_mission_definitions md ON md.id=wm.mission_id WHERE wm.user_id=$1 AND wm.week_start=$2 AND wm.mission_id=$3 FOR UPDATE`,[u.id,week,id]);const m=r.rows[0];if(!m||!m.completed||m.claimed)throw new Error("Weekly mission is not ready to claim.");await client.query(`UPDATE ludo_users SET coins=coins+$1,gems=gems+$2 WHERE id=$3`,[m.reward_coins||0,m.reward_gems||0,u.id]);await client.query(`UPDATE ludo_weekly_missions SET claimed=TRUE,claimed_at=NOW() WHERE user_id=$1 AND week_start=$2 AND mission_id=$3`,[u.id,week,id]);await client.query("COMMIT");return NextResponse.json({ok:true});}catch(e){await client.query("ROLLBACK");return NextResponse.json({error:e instanceof Error?e.message:"Claim failed."},{status:400});}finally{client.release()}}
 if(action==="claim_bonus"){const client=await pool.connect();try{await client.query("BEGIN");const r=await client.query(`SELECT * FROM ludo_weekly_mission_bonus WHERE user_id=$1 AND week_start=$2 FOR UPDATE`,[u.id,week]);const bns=r.rows[0];if(!bns||!bns.unlocked||bns.claimed)throw new Error("Weekly bonus is not ready to claim.");const prize=await getBonus(week);await client.query(`UPDATE ludo_users SET coins=coins+$1,gems=gems+$2 WHERE id=$3`,[prize.coins,prize.gems,u.id]);await client.query(`UPDATE ludo_weekly_mission_bonus SET claimed=TRUE,claimed_at=NOW() WHERE user_id=$1 AND week_start=$2`,[u.id,week]);await client.query("COMMIT");return NextResponse.json({ok:true,reward:prize});}catch(e){await client.query("ROLLBACK");return NextResponse.json({error:e instanceof Error?e.message:"Weekly bonus claim failed."},{status:400});}finally{client.release()}}
 return NextResponse.json({error:"Unknown weekly mission action."},{status:400});
 }catch(e){console.error(e);return NextResponse.json({error:"Weekly mission service unavailable."},{status:500});}}
