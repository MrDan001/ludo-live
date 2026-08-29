import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";

async function admin(q: NextRequest) {
  const token = q.cookies.get("ludo_session")?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`, [hash]);
  const u = r.rows[0];
  if (!u || u.is_guest || u.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  return u.email && allowed.includes(u.email.toLowerCase()) ? u : null;
}

async function setup() {
  await ensureAuthSchema();
  await pool.query(`CREATE TABLE IF NOT EXISTS ludo_mission_definitions(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',target INTEGER NOT NULL DEFAULT 1,reward_coins INTEGER NOT NULL DEFAULT 0,reward_gems INTEGER NOT NULL DEFAULT 0,kind TEXT NOT NULL DEFAULT 'play_games',admin_created BOOLEAN NOT NULL DEFAULT FALSE,active BOOLEAN NOT NULL DEFAULT TRUE,scheduled_date DATE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
}

const validKinds = new Set(["play_games","win_games","roll_dice","move_tokens","send_messages","join_rooms","create_rooms","roll_sixes","move_home","complete_games"]);

export async function GET(q: NextRequest) {
  try { const a = await admin(q); if (!a) return NextResponse.json({error:"Admin access required."},{status:403}); await setup(); const r=await pool.query(`SELECT id,title,description,target,reward_coins AS "rewardCoins",reward_gems AS "rewardGems",kind,admin_created AS "adminCreated",active,scheduled_date AS "scheduledDate",created_at AS "createdAt" FROM ludo_mission_definitions ORDER BY admin_created DESC,created_at DESC`); return NextResponse.json({missions:r.rows}); }
  catch(e){ console.error(e); return NextResponse.json({error:"Mission admin unavailable."},{status:500}); }
}

export async function POST(q: NextRequest) {
  try { const a = await admin(q); if (!a) return NextResponse.json({error:"Admin access required."},{status:403}); await setup(); const b=await q.json(); const action=String(b.action||"");
    if(action==="create"||action==="edit"){
      const id=String(b.id||`admin-mission-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g,"-").slice(0,80); const title=String(b.title||"").trim().slice(0,120); const description=String(b.description||"").trim().slice(0,300); const target=Math.max(1,Math.min(100000,Math.trunc(Number(b.target)||1))); const rewardCoins=Math.max(0,Math.trunc(Number(b.rewardCoins)||0)); const rewardGems=Math.max(0,Math.trunc(Number(b.rewardGems)||0)); const kind=String(b.kind||"play_games"); const active=b.active!==false; const scheduledDate=b.scheduledDate?String(b.scheduledDate):null;
      if(!title||!validKinds.has(kind)) return NextResponse.json({error:"Title and valid mission type are required."},{status:400});
      if(action==="create") await pool.query(`INSERT INTO ludo_mission_definitions(id,title,description,target,reward_coins,reward_gems,kind,admin_created,active,scheduled_date) VALUES($1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9)`,[id,title,description,target,rewardCoins,rewardGems,kind,active,scheduledDate]);
      else { const r=await pool.query(`UPDATE ludo_mission_definitions SET title=$1,description=$2,target=$3,reward_coins=$4,reward_gems=$5,kind=$6,active=$7,scheduled_date=$8 WHERE id=$9 AND admin_created=TRUE`,[title,description,target,rewardCoins,rewardGems,kind,active,scheduledDate,id]); if(!r.rowCount)return NextResponse.json({error:"Admin mission not found."},{status:404}); }
      await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,details) VALUES($1,$2,$3)`,[a.id,action==="create"?"create_mission":"edit_mission",JSON.stringify({id,title,target,rewardCoins,rewardGems,kind,active,scheduledDate})]); return NextResponse.json({ok:true,id});
    }
    if(action==="toggle"){const id=String(b.id||"");const r=await pool.query(`UPDATE ludo_mission_definitions SET active=NOT active WHERE id=$1 AND admin_created=TRUE RETURNING active`,[id]);if(!r.rowCount)return NextResponse.json({error:"Admin mission not found."},{status:404});await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,details) VALUES($1,'mission_toggle',$2)`,[a.id,JSON.stringify({id,active:r.rows[0].active})]);return NextResponse.json({ok:true});}
    if(action==="delete"){const id=String(b.id||"");const r=await pool.query(`DELETE FROM ludo_mission_definitions WHERE id=$1 AND admin_created=TRUE`,[id]);if(!r.rowCount)return NextResponse.json({error:"Admin mission not found."},{status:404});await pool.query(`INSERT INTO ludo_admin_actions(admin_user_id,action,details) VALUES($1,'delete_mission',$2)`,[a.id,JSON.stringify({id})]);return NextResponse.json({ok:true});}
    return NextResponse.json({error:"Unknown mission admin action."},{status:400});
  } catch(e){console.error(e);return NextResponse.json({error:e instanceof Error?e.message:"Mission admin action failed."},{status:500});}
}
