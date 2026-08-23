import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { currentUser } from "../../../lib/auth-session";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

type Kind="play_games"|"win_games"|"roll_dice"|"move_tokens"|"send_messages"|"join_rooms"|"create_rooms"|"roll_sixes"|"move_home"|"complete_games";
type Difficulty="easy"|"hard"|"very_hard";
type Seed={id:string;title:string;description:string;target:number;kind:Kind;difficulty:Difficulty;rewardCoins:number;rewardGems:number};

const raw:[string,string,Kind,number[]][]=[
 ["Play {n} Ludo games","Play {n} Ludo games this week.","play_games",[3,5,8,12,20]],
 ["Win {n} Ludo games","Win {n} Ludo games this week.","win_games",[2,3,5,8,12]],
 ["Roll {n} dice times","Make {n} dice rolls this week.","roll_dice",[20,35,50,80,150]],
 ["Make {n} token moves","Make {n} legal token moves this week.","move_tokens",[15,25,40,70,150]],
 ["Send {n} room messages","Send {n} messages in Ludo rooms this week.","send_messages",[5,10,20,35,75]],
 ["Join {n} online rooms","Join {n} online Ludo rooms this week.","join_rooms",[2,4,6,10,15]],
 ["Create {n} game rooms","Create {n} Ludo game rooms this week.","create_rooms",[1,2,3,5,10]],
 ["Roll {n} sixes","Roll a 6 {n} times this week.","roll_sixes",[2,3,5,8,15]],
 ["Bring {n} tokens home","Bring {n} tokens all the way home this week.","move_home",[3,5,8,12,20]],
 ["Finish {n} Ludo games","Finish {n} Ludo games this week.","complete_games",[1,2,3,5,8]]
];
const CATALOG:Seed[]=raw.flatMap((t,i)=>t[3].map((target,j)=>({id:`weekly-${i*5+j+1}`,title:t[0].replace("{n}",String(target)),description:t[1].replace("{n}",String(target)),target,kind:t[2],difficulty:(j<3?"easy":j===3?"hard":"very_hard") as Difficulty,rewardCoins:[2500,4000,6000,10000,16000][j],rewardGems:[2,5,8,15,25][j]})));
const DEFAULT_BONUS={coins:50000,gems:100};
const weekStart=()=>{const d=new Date();const day=d.getUTCDay();d.setUTCDate(d.getUTCDate()+(day===0?-6:1-day));return d.toISOString().slice(0,10)};
const weekEnd=(s:string)=>{const d=new Date(`${s}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+7);return d.toISOString().slice(0,10)};
const hash=(s:string)=>parseInt(createHash("sha256").update(s).digest("hex").slice(0,8),16);

async function setup(){
 await ensureAuthSchema();
 await pool.query(`CREATE TABLE IF NOT EXISTS ludo_weekly_mission_definitions(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',target INTEGER NOT NULL DEFAULT 1,reward_coins INTEGER NOT NULL DEFAULT 0,reward_gems INTEGER NOT NULL DEFAULT 0,kind TEXT NOT NULL DEFAULT 'play_games',difficulty TEXT NOT NULL DEFAULT 'easy',admin_created BOOLEAN NOT NULL DEFAULT FALSE,active BOOLEAN NOT NULL DEFAULT TRUE,scheduled_week DATE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
 CREATE TABLE IF NOT EXISTS ludo_weekly_missions(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,week_start DATE NOT NULL,slot INTEGER NOT NULL,mission_id TEXT NOT NULL REFERENCES ludo_weekly_mission_definitions(id) ON DELETE CASCADE,completed BOOLEAN NOT NULL DEFAULT FALSE,claimed BOOLEAN NOT NULL DEFAULT FALSE,claimed_at TIMESTAMPTZ,PRIMARY KEY(user_id,week_start,slot),UNIQUE(user_id,week_start,mission_id));
 CREATE TABLE IF NOT EXISTS ludo_weekly_assignment_bundles(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,week_start DATE NOT NULL,signature TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,week_start),UNIQUE(week_start,signature));
 CREATE TABLE IF NOT EXISTS ludo_weekly_mission_bonus(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,week_start DATE NOT NULL,unlocked BOOLEAN NOT NULL DEFAULT FALSE,claimed BOOLEAN NOT NULL DEFAULT FALSE,claimed_at TIMESTAMPTZ,PRIMARY KEY(user_id,week_start));
 CREATE TABLE IF NOT EXISTS ludo_weekly_mission_settings(week_start DATE PRIMARY KEY,bonus_coins INTEGER NOT NULL DEFAULT 50000,bonus_gems INTEGER NOT NULL DEFAULT 100,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
 const json=JSON.stringify(CATALOG);
 await pool.query(`INSERT INTO ludo_weekly_mission_definitions(id,title,description,target,reward_coins,reward_gems,kind,difficulty) SELECT id,title,description,target,"rewardCoins","rewardGems",kind,difficulty FROM jsonb_to_recordset($1::jsonb) AS x(id text,title text,description text,target integer,"rewardCoins" integer,"rewardGems" integer,kind text,difficulty text) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,target=EXCLUDED.target,reward_coins=EXCLUDED.reward_coins,reward_gems=EXCLUDED.reward_gems,kind=EXCLUDED.kind,difficulty=EXCLUDED.difficulty WHERE ludo_weekly_mission_definitions.admin_created=FALSE`,[json]);
 await pool.query(`UPDATE ludo_weekly_mission_definitions SET reward_coins=COALESCE(reward_coins,0),reward_gems=COALESCE(reward_gems,0) WHERE reward_coins IS NULL OR reward_gems IS NULL`);
}
async function progressFor(uid:string,start:string){const r=await pool.query(`SELECT kind,COALESCE(SUM(amount),0)::int progress FROM ludo_mission_events WHERE user_id=$1 AND event_day >= $2 AND event_day < $3 GROUP BY kind`,[uid,start,weekEnd(start)]);return Object.fromEntries(r.rows.map((x:any)=>[x.kind,Number(x.progress)]));}
async function assign(uid:string){
 const week=weekStart();
 const existing=await pool.query(`SELECT wm.slot,wm.mission_id,wm.completed,wm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.difficulty,md.admin_created FROM ludo_weekly_missions wm JOIN ludo_weekly_mission_definitions md ON md.id=wm.mission_id WHERE wm.user_id=$1 AND wm.week_start=$2 ORDER BY wm.slot`,[uid,week]);
 if(existing.rowCount===10)return existing.rows;
 const selected:Seed[]=[];const used=new Set(existing.rows.map((x:any)=>x.mission_id));
 const need:Record<Difficulty,number>={easy:5,hard:3,very_hard:2};
 const admin=await pool.query(`SELECT id,title,description,target,reward_coins,reward_gems,kind,difficulty FROM ludo_weekly_mission_definitions WHERE active=TRUE AND admin_created=TRUE AND scheduled_week=$1 ORDER BY created_at ASC`,[week]);
 for(const d of ["easy","hard","very_hard"] as Difficulty[])for(const x of admin.rows.filter((r:any)=>r.difficulty===d)){if(selected.filter(m=>m.difficulty===d).length>=need[d])break;if(!used.has(x.id)){selected.push({id:x.id,title:x.title,description:x.description,target:Number(x.target),kind:x.kind,difficulty:d,rewardCoins:Number(x.reward_coins||0),rewardGems:Number(x.reward_gems||0)});used.add(x.id);}}
 for(const d of ["easy","hard","very_hard"] as Difficulty[]){const poolRows=CATALOG.filter(x=>x.difficulty===d);const start=hash(`${uid}:${week}:${d}`)%poolRows.length;for(let i=0;selected.filter(m=>m.difficulty===d).length<need[d];i++){const x=poolRows[(start+i)%poolRows.length];if(!used.has(x.id)){selected.push(x);used.add(x.id);}}}
 let slot=1;for(const x of selected){if(slot>10)break;const r=await pool.query(`INSERT INTO ludo_weekly_missions(user_id,week_start,slot,mission_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[uid,week,slot,x.id]);if(r.rowCount)slot++;}
 const out=await pool.query(`SELECT wm.slot,wm.mission_id,wm.completed,wm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.difficulty,md.admin_created FROM ludo_weekly_missions wm JOIN ludo_weekly_mission_definitions md ON md.id=wm.mission_id WHERE wm.user_id=$1 AND wm.week_start=$2 ORDER BY wm.slot`,[uid,week]);
 return out.rows.slice(0,10);
}
async function refreshCompletion(uid:string,week:string){const p=await progressFor(uid,week);await pool.query(`UPDATE ludo_weekly_missions wm SET completed=TRUE FROM ludo_weekly_mission_definitions md WHERE wm.mission_id=md.id AND wm.user_id=$1 AND wm.week_start=$2 AND wm.completed=FALSE AND COALESCE($3::jsonb->>md.kind,'0')::int >= md.target`,[uid,week,JSON.stringify(p)]);const done=await pool.query(`SELECT COUNT(*)::int n FROM ludo_weekly_missions WHERE user_id=$1 AND week_start=$2 AND completed=TRUE`,[uid,week]);if(Number(done.rows[0]?.n||0)>=10)await pool.query(`INSERT INTO ludo_weekly_mission_bonus(user_id,week_start,unlocked) VALUES($1,$2,TRUE) ON CONFLICT(user_id,week_start) DO UPDATE SET unlocked=TRUE`,[uid,week]);}
async function weeklyBonus(week:string){const r=await pool.query(`SELECT bonus_coins,bonus_gems FROM ludo_weekly_mission_settings WHERE week_start=$1`,[week]);return r.rows[0]?{coins:Number(r.rows[0].bonus_coins),gems:Number(r.rows[0].bonus_gems)}:DEFAULT_BONUS;}

export async function GET(q:NextRequest){try{await setup();const u=await currentUser(q);if(!u)return NextResponse.json({error:"Login required."},{status:401});const week=weekStart();await assign(u.id);await refreshCompletion(u.id,week);const missions=await pool.query(`SELECT wm.slot,wm.mission_id,wm.completed,wm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.difficulty,md.admin_created FROM ludo_weekly_missions wm JOIN ludo_weekly_mission_definitions md ON md.id=wm.mission_id WHERE wm.user_id=$1 AND wm.week_start=$2 ORDER BY wm.slot`,[u.id,week]);const bonus=await pool.query(`SELECT unlocked,claimed FROM ludo_weekly_mission_bonus WHERE user_id=$1 AND week_start=$2`,[u.id,week]);return NextResponse.json({weekStart:week,missions:missions.rows.slice(0,10),progress:await progressFor(u.id,week),bonus:bonus.rows[0]||{unlocked:false,claimed:false},weeklyBonus:await weeklyBonus(week)});}catch(e){console.error("weekly missions GET",e);return NextResponse.json({error:"Weekly mission service unavailable."},{status:500});}}
export async function POST(q:NextRequest){try{await setup();const u=await currentUser(q);if(!u)return NextResponse.json({error:"Login required."},{status:401});const b=await q.json();const week=weekStart();if(b.action==="claim"){const c=await pool.connect();try{await c.query("BEGIN");const r=await c.query(`SELECT wm.*,md.reward_coins,md.reward_gems FROM ludo_weekly_missions wm JOIN ludo_weekly_mission_definitions md ON md.id=wm.mission_id WHERE wm.user_id=$1 AND wm.week_start=$2 AND wm.mission_id=$3 FOR UPDATE`,[u.id,week,String(b.missionId||"")]);const m=r.rows[0];if(!m||!m.completed||m.claimed)throw Error("Weekly mission is not ready to claim.");await c.query(`UPDATE ludo_users SET coins=coins+$1,gems=gems+$2 WHERE id=$3`,[Number(m.reward_coins||0),Number(m.reward_gems||0),u.id]);await c.query(`UPDATE ludo_weekly_missions SET claimed=TRUE,claimed_at=NOW() WHERE user_id=$1 AND week_start=$2 AND mission_id=$3`,[u.id,week,m.mission_id]);await c.query("COMMIT");return NextResponse.json({ok:true});}catch(e){await c.query("ROLLBACK");return NextResponse.json({error:e instanceof Error?e.message:"Claim failed."},{status:400});}finally{c.release();}}
 if(b.action==="claim_bonus"){const c=await pool.connect();try{await c.query("BEGIN");const r=await c.query(`SELECT * FROM ludo_weekly_mission_bonus WHERE user_id=$1 AND week_start=$2 FOR UPDATE`,[u.id,week]);const row=r.rows[0];if(!row||!row.unlocked||row.claimed)throw Error("Weekly bonus is not ready to claim.");const prize=await weeklyBonus(week);await c.query(`UPDATE ludo_users SET coins=coins+$1,gems=gems+$2 WHERE id=$3`,[prize.coins,prize.gems,u.id]);await c.query(`UPDATE ludo_weekly_mission_bonus SET claimed=TRUE,claimed_at=NOW() WHERE user_id=$1 AND week_start=$2`,[u.id,week]);await c.query("COMMIT");return NextResponse.json({ok:true,reward:prize});}catch(e){await c.query("ROLLBACK");return NextResponse.json({error:e instanceof Error?e.message:"Weekly bonus claim failed."},{status:400});}finally{c.release();}}
 return NextResponse.json({error:"Unknown weekly mission action."},{status:400});}catch(e){console.error("weekly missions POST",e);return NextResponse.json({error:"Weekly mission service unavailable."},{status:500});}}
