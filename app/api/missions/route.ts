import { NextRequest, NextResponse } from "next/server";
import { pool, ensureAuthSchema } from "../auth/_db";
import { currentUser } from "../../../lib/auth-session";

type Kind = "play_games" | "win_games" | "roll_dice" | "move_tokens" | "send_messages" | "join_rooms" | "create_rooms" | "roll_sixes" | "move_home" | "complete_games";
const TARGETS = [1,2,3,4,5,6,8,10,12,15];
const CATALOG:Array<{id:string;title:string;description:string;target:number;rewardCoins:number;rewardGems:number;kind:Kind}> = [];
const reward=(target:number)=>({rewardCoins:Math.min(4000,250+target*75),rewardGems:target>=5?(target>=10?10:5):0});
const addSeries=(start:number,kind:Kind,noun:string,verb:string,description:string)=>TARGETS.forEach((target,i)=>{const r=reward(target);CATALOG.push({id:`mission-${start+i}`,title:`${verb} ${target} ${noun}`,description:description.replace("{n}",String(target)),target,...r,kind});});
addSeries(1,"play_games","Games","Play","Play {n} Ludo games today.");
addSeries(11,"win_games","Games","Win","Win {n} Ludo games today.");
addSeries(21,"roll_dice","Dice Rolls","Make","Make {n} dice rolls in Ludo today.");
addSeries(31,"move_tokens","Token Moves","Make","Make {n} legal token moves in Ludo today.");
addSeries(41,"send_messages","Messages","Send","Send {n} messages in a Ludo room today.");
addSeries(51,"join_rooms","Online Rooms","Join","Join {n} online Ludo rooms today.");
addSeries(61,"create_rooms","Game Rooms","Create","Create {n} Ludo game rooms today.");
addSeries(71,"roll_sixes","Sixes","Roll","Roll a 6 exactly {n} times today.");
addSeries(81,"move_home","Tokens Home","Bring","Bring {n} of your tokens all the way home today.");
addSeries(91,"complete_games","Games","Finish","Finish {n} Ludo games today.");
const VALID_KINDS=new Set<Kind>(CATALOG.map(m=>m.kind));
const today=()=>new Date().toISOString().slice(0,10);

async function setup(){
  await ensureAuthSchema();
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_mission_definitions(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',target INTEGER NOT NULL DEFAULT 1,reward_coins INTEGER NOT NULL DEFAULT 0,reward_gems INTEGER NOT NULL DEFAULT 0,kind TEXT NOT NULL DEFAULT 'play_games',admin_created BOOLEAN NOT NULL DEFAULT FALSE,active BOOLEAN NOT NULL DEFAULT TRUE,scheduled_date DATE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());CREATE TABLE IF NOT EXISTS ludo_daily_missions(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,mission_day DATE NOT NULL,slot INTEGER NOT NULL,mission_id TEXT NOT NULL REFERENCES ludo_mission_definitions(id) ON DELETE CASCADE,completed BOOLEAN NOT NULL DEFAULT FALSE,claimed BOOLEAN NOT NULL DEFAULT FALSE,claimed_at TIMESTAMPTZ,PRIMARY KEY(user_id,mission_day,slot),UNIQUE(user_id,mission_day,mission_id));CREATE TABLE IF NOT EXISTS ludo_daily_mission_bonus(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,mission_day DATE NOT NULL,unlocked BOOLEAN NOT NULL DEFAULT FALSE,claimed BOOLEAN NOT NULL DEFAULT FALSE,claimed_at TIMESTAMPTZ,PRIMARY KEY(user_id,mission_day));CREATE TABLE IF NOT EXISTS ludo_daily_mission_progress(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,mission_day DATE NOT NULL,kind TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,mission_day,kind));CREATE TABLE IF NOT EXISTS ludo_mission_events(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,event_day DATE NOT NULL,event_id TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,event_id));`);
  await pool.query(`INSERT INTO ludo_mission_definitions(id,title,description,target,reward_coins,reward_gems,kind) SELECT id,title,description,target,rewardCoins,rewardGems,kind FROM jsonb_to_recordset($1::jsonb) AS x(id text,title text,description text,target integer,rewardCoins integer,rewardGems integer,kind text) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,target=EXCLUDED.target,reward_coins=EXCLUDED.reward_coins,reward_gems=EXCLUDED.reward_gems,kind=EXCLUDED.kind WHERE ludo_mission_definitions.admin_created=FALSE`,[JSON.stringify(CATALOG)]);
}

async function assign(uid:string){
  const day=today();
  const existing=await pool.query(`SELECT dm.slot,dm.mission_id,dm.completed,dm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.admin_created FROM ludo_daily_missions dm JOIN ludo_mission_definitions md ON md.id=dm.mission_id WHERE dm.user_id=$1 AND dm.mission_day=$2 ORDER BY dm.slot`,[uid,day]);
  const admin=await pool.query(`SELECT * FROM ludo_mission_definitions WHERE active=TRUE AND admin_created=TRUE AND scheduled_date=$1 ORDER BY created_at ASC LIMIT 6`,[day]);
  const assigned=new Set<string>(existing.rows.map((x:any)=>x.mission_id));
  for(const a of admin.rows){
    if(assigned.has(a.id))continue;
    const old=existing.rows.find((x:any)=>!x.admin_created&&!x.completed&&!x.claimed&&!assigned.has(x.mission_id));
    if(old){await pool.query(`UPDATE ludo_daily_missions SET mission_id=$1 WHERE user_id=$2 AND mission_day=$3 AND slot=$4`,[a.id,uid,day,old.slot]);old.mission_id=a.id;old.admin_created=true;}
    else if(existing.rows.length<6){const slot=existing.rows.length+1;await pool.query(`INSERT INTO ludo_daily_missions(user_id,mission_day,slot,mission_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[uid,day,slot,a.id]);existing.rows.push({mission_id:a.id,admin_created:true,completed:false,claimed:false,slot});}
    assigned.add(a.id);
  }
  const finalExisting=await pool.query(`SELECT dm.slot,dm.mission_id,dm.completed,dm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.admin_created FROM ludo_daily_missions dm JOIN ludo_mission_definitions md ON md.id=dm.mission_id WHERE dm.user_id=$1 AND dm.mission_day=$2 ORDER BY dm.slot`,[uid,day]);
  const count=finalExisting.rowCount??0;
  if(count>=6)return finalExisting.rows.slice(0,6);
  const used=new Set<string>(finalExisting.rows.map((x:any)=>x.mission_id));
  const poolRows=await pool.query(`SELECT * FROM ludo_mission_definitions WHERE active=TRUE AND admin_created=FALSE ORDER BY md5(id || $1) LIMIT 100`,[day]);
  const candidates=poolRows.rows.filter((x:any)=>!used.has(x.id)).slice(0,6-count);
  for(let i=0;i<candidates.length;i++)await pool.query(`INSERT INTO ludo_daily_missions(user_id,mission_day,slot,mission_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[uid,day,count+i+1,candidates[i].id]);
  return (await pool.query(`SELECT dm.slot,dm.mission_id,dm.completed,dm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.admin_created FROM ludo_daily_missions dm JOIN ludo_mission_definitions md ON md.id=dm.mission_id WHERE dm.user_id=$1 AND dm.mission_day=$2 ORDER BY dm.slot`,[uid,day])).rows.slice(0,6);
}

async function progressFor(uid:string,day:string){const r=await pool.query(`SELECT kind,progress FROM ludo_daily_mission_progress WHERE user_id=$1 AND mission_day=$2`,[uid,day]);return Object.fromEntries(r.rows.map((x:any)=>[x.kind,Number(x.progress)]));}
async function refreshCompletion(uid:string,day:string){
  const rows=await pool.query(`SELECT dm.mission_id,dm.completed,md.kind,md.target FROM ludo_daily_missions dm JOIN ludo_mission_definitions md ON md.id=dm.mission_id WHERE dm.user_id=$1 AND dm.mission_day=$2`,[uid,day]);
  const p=await progressFor(uid,day);
  for(const m of rows.rows)if(!m.completed&&Number(p[m.kind]||0)>=Number(m.target))await pool.query(`UPDATE ludo_daily_missions SET completed=TRUE WHERE user_id=$1 AND mission_day=$2 AND mission_id=$3`,[uid,day,m.mission_id]);
  const done=await pool.query(`SELECT COUNT(*)::int AS n FROM ludo_daily_missions WHERE user_id=$1 AND mission_day=$2 AND completed=TRUE`,[uid,day]);
  if(Number(done.rows[0]?.n||0)>=6)await pool.query(`INSERT INTO ludo_daily_mission_bonus(user_id,mission_day,unlocked) VALUES($1,$2,TRUE) ON CONFLICT(user_id,mission_day) DO UPDATE SET unlocked=TRUE`,[uid,day]);
}

export async function GET(q:NextRequest){try{await setup();const u=await currentUser(q);if(!u)return NextResponse.json({error:"Login required."},{status:401});const day=today();await assign(u.id);await refreshCompletion(u.id,day);const missions=await pool.query(`SELECT dm.slot,dm.mission_id,dm.completed,dm.claimed,md.title,md.description,md.target,md.reward_coins,md.reward_gems,md.kind,md.admin_created FROM ludo_daily_missions dm JOIN ludo_mission_definitions md ON md.id=dm.mission_id WHERE dm.user_id=$1 AND dm.mission_day=$2 ORDER BY dm.slot`,[u.id,day]);const bonus=await pool.query(`SELECT unlocked,claimed FROM ludo_daily_mission_bonus WHERE user_id=$1 AND mission_day=$2`,[u.id,day]);return NextResponse.json({day,missions:missions.rows.slice(0,6),progress:await progressFor(u.id,day),bonus:bonus.rows[0]||{unlocked:false,claimed:false},dailyBonus:{coins:5000,gems:50}});}catch(e){console.error(e);return NextResponse.json({error:"Mission service unavailable."},{status:500});}}

export async function POST(q:NextRequest){try{await setup();const u=await currentUser(q);if(!u)return NextResponse.json({error:"Login required."},{status:401});const b=await q.json();const action=String(b.action||"");const day=today();
  if(action==="event"){
    const kind=String(b.kind||"") as Kind;const amount=Math.max(1,Math.min(50,Math.trunc(Number(b.amount||1))));const eventId=String(b.eventId||"").slice(0,120);if(!VALID_KINDS.has(kind)||!eventId)return NextResponse.json({error:"Invalid mission event."},{status:400});
    const client=await pool.connect();try{await client.query("BEGIN");const ins=await client.query(`INSERT INTO ludo_mission_events(user_id,event_day,event_id,kind,amount) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,event_id) DO NOTHING RETURNING event_id`,[u.id,day,eventId,kind,amount]);if((ins.rowCount??0)>0)await client.query(`INSERT INTO ludo_daily_mission_progress(user_id,mission_day,kind,progress) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,mission_day,kind) DO UPDATE SET progress=ludo_daily_mission_progress.progress+EXCLUDED.progress`,[u.id,day,kind,amount]);await client.query("COMMIT");}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
    await assign(u.id);await refreshCompletion(u.id,day);return NextResponse.json({ok:true,progress:await progressFor(u.id,day)});
  }
  if(action==="claim"){
    const id=String(b.missionId||"");const client=await pool.connect();try{await client.query("BEGIN");const r=await client.query(`SELECT dm.*,md.reward_coins,md.reward_gems FROM ludo_daily_missions dm JOIN ludo_mission_definitions md ON md.id=dm.mission_id WHERE dm.user_id=$1 AND dm.mission_day=$2 AND dm.mission_id=$3 FOR UPDATE`,[u.id,day,id]);const m=r.rows[0];if((r.rowCount??0)===0||!m.completed||m.claimed)throw new Error("Mission is not ready to claim.");await client.query(`UPDATE ludo_users SET coins=coins+$1,gems=gems+$2 WHERE id=$3`,[m.reward_coins||0,m.reward_gems||0,u.id]);await client.query(`UPDATE ludo_daily_missions SET claimed=TRUE,claimed_at=NOW() WHERE user_id=$1 AND mission_day=$2 AND mission_id=$3`,[u.id,day,id]);await client.query("COMMIT");return NextResponse.json({ok:true});}catch(e){await client.query("ROLLBACK");return NextResponse.json({error:e instanceof Error?e.message:"Claim failed."},{status:400});}finally{client.release()}
  }
  if(action==="claim_bonus"){
    const client=await pool.connect();try{await client.query("BEGIN");const r=await client.query(`SELECT * FROM ludo_daily_mission_bonus WHERE user_id=$1 AND mission_day=$2 FOR UPDATE`,[u.id,day]);const bonus=r.rows[0];if((r.rowCount??0)===0||!bonus.unlocked||bonus.claimed)throw new Error("Daily bonus is not ready to claim.");await client.query(`UPDATE ludo_users SET coins=coins+5000,gems=gems+50 WHERE id=$1`,[u.id]);await client.query(`UPDATE ludo_daily_mission_bonus SET claimed=TRUE,claimed_at=NOW() WHERE user_id=$1 AND mission_day=$2`,[u.id,day]);await client.query("COMMIT");return NextResponse.json({ok:true});}catch(e){await client.query("ROLLBACK");return NextResponse.json({error:e instanceof Error?e.message:"Bonus claim failed."},{status:400});}finally{client.release()}
  }
  return NextResponse.json({error:"Unknown mission action."},{status:400});
}catch(e){console.error(e);return NextResponse.json({error:"Mission service unavailable."},{status:500});}}
