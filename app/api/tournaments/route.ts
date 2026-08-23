import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { pool, ensureAuthSchema } from "../auth/_db";
import { ensureTournamentV2Schema } from "./_schema";

const MAX_ACTIVE = 3;
const WIN_POINTS = 5;
const QUALIFY_POINTS = 50;
const JOIN_CUTOFF_DAYS = 2;

async function user(q: NextRequest) {
  const token = q.cookies.get("ludo_session")?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>("SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1", [hash]);
  return r.rows[0] || null;
}

function weights(multiplier: number) {
  const m = Math.max(0, Number.isFinite(multiplier) ? multiplier : 0.2);
  const raw = Array.from({ length: 10 }, (_, i) => Math.pow(1 + m, 9 - i));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map(v => v / total);
}

function prizeFor(poolCoins: number, multiplier: number) {
  const ws = weights(multiplier);
  const prizes = ws.map((w, i) => ({ place: i + 1, coins: Math.floor(poolCoins * w) }));
  const remainder = poolCoins - prizes.reduce((sum, p) => sum + p.coins, 0);
  if (prizes.length) prizes[0].coins += remainder;
  return prizes;
}

async function rank(client: any, tournamentId: string) {
  const r = await client.query<any>(
    `SELECT s.user_id,s.points,s.wins,s.eligible,s.active,s.score_reached_at,u.username
     FROM ludo_tournament_player_stats s JOIN ludo_users u ON u.id=s.user_id
     WHERE s.tournament_id=$1 AND s.active=TRUE
     ORDER BY s.points DESC,s.score_reached_at ASC,u.username ASC`, [tournamentId]
  );
  return r.rows.map((x: any, i: number) => ({ ...x, position: i + 1 }));
}

export async function GET(q: NextRequest) {
  try {
    await ensureAuthSchema(); await ensureTournamentV2Schema();
    const current = await user(q); const id = q.nextUrl.searchParams.get("id");
    const tournaments = await pool.query<any>(
      `SELECT t.*,COUNT(e.user_id)::int players_count,
       MAX(CASE WHEN e.user_id=$1 AND e.status='active' THEN 1 ELSE 0 END)::int joined
       FROM ludo_tournaments t LEFT JOIN ludo_tournament_entries e ON e.tournament_id=t.id
       WHERE t.status NOT IN ('draft') GROUP BY t.id ORDER BY t.starts_at ASC`, [current?.id || null]
    );
    const mine = current ? (await pool.query<any>(
      `SELECT e.tournament_id,e.status,e.joined_at,t.name,t.status tournament_status,
       COALESCE(s.points,0)::int points,COALESCE(s.wins,0)::int wins,COALESCE(s.eligible,FALSE) eligible
       FROM ludo_tournament_entries e JOIN ludo_tournaments t ON t.id=e.tournament_id
       LEFT JOIN ludo_tournament_player_stats s ON s.tournament_id=e.tournament_id AND s.user_id=e.user_id
       WHERE e.user_id=$1 ORDER BY e.joined_at DESC`, [current.id]
    )).rows : [];
    const selected = id ? tournaments.rows.find((t:any)=>String(t.id)===String(id)) || null : null;
    const leaderboard = selected ? await rank(pool,id!) : [];
    return NextResponse.json({tournaments:tournaments.rows,mine,selected,leaderboard,constants:{maxActive:MAX_ACTIVE,winPoints:WIN_POINTS,qualifyPoints:QUALIFY_POINTS,joinCutoffDays:JOIN_CUTOFF_DAYS}});
  } catch (e) { console.error(e); return NextResponse.json({error:"Tournament service unavailable."},{status:500}); }
}

export async function POST(q: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureAuthSchema(); await ensureTournamentV2Schema();
    const current = await user(q);
    if (!current || current.is_guest || current.is_banned) return NextResponse.json({error:"You must be signed in to enter tournaments."},{status:401});
    const body = await q.json(); const action=String(body.action||"");

    if(action==="join"){
      const tournamentId=String(body.tournamentId||""); await client.query("BEGIN");
      const tr=await client.query<any>("SELECT * FROM ludo_tournaments WHERE id=$1 FOR UPDATE",[tournamentId]);
      if(!tr.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Tournament not found."},{status:404});}
      const t=tr.rows[0]; const cutoff=new Date(new Date(t.ends_at).getTime()-Number(t.join_cutoff_days||JOIN_CUTOFF_DAYS)*86400000);
      if(!["open","live"].includes(t.status)||new Date()>=cutoff||new Date(t.ends_at)<=new Date()){await client.query("ROLLBACK");return NextResponse.json({error:"Tournament entry is closed."},{status:400});}
      const activeCount=await client.query("SELECT COUNT(*)::int n FROM ludo_tournament_entries WHERE user_id=$1 AND status='active'",[current.id]);
      if(Number(activeCount.rows[0].n)>=MAX_ACTIVE){await client.query("ROLLBACK");return NextResponse.json({error:"You can only have 3 active tournaments."},{status:409});}
      const existing=await client.query("SELECT status FROM ludo_tournament_entries WHERE tournament_id=$1 AND user_id=$2",[tournamentId,current.id]);
      if(existing.rowCount&&existing.rows[0].status!=="withdrawn"){await client.query("ROLLBACK");return NextResponse.json({error:"You already entered this tournament."},{status:409});}
      const count=await client.query("SELECT COUNT(*)::int n FROM ludo_tournament_entries WHERE tournament_id=$1 AND status='active'",[tournamentId]);
      if(Number(count.rows[0].n)>=Number(t.max_players)){await client.query("ROLLBACK");return NextResponse.json({error:"Tournament is full."},{status:409});}
      const entryCoins=Number(t.entry_fee_coins||0),entryGems=Number(t.entry_fee_gems||0);
      const wallet=await client.query<any>("SELECT coins,gems FROM ludo_users WHERE id=$1 FOR UPDATE",[current.id]);
      if(Number(wallet.rows[0].coins)<entryCoins||Number(wallet.rows[0].gems)<entryGems){await client.query("ROLLBACK");return NextResponse.json({error:"Insufficient balance for the current entry fee."},{status:402});}
      if(entryCoins)await client.query("UPDATE ludo_users SET coins=coins-$1 WHERE id=$2",[entryCoins,current.id]);
      if(entryGems)await client.query("UPDATE ludo_users SET gems=gems-$1 WHERE id=$2",[entryGems,current.id]);
      await client.query(`INSERT INTO ludo_tournament_entries(tournament_id,user_id,status,seed) VALUES($1,$2,'active',$3) ON CONFLICT(tournament_id,user_id) DO UPDATE SET status='active',joined_at=NOW(),eliminated_at=NULL`,[tournamentId,current.id,Number(count.rows[0].n)+1]);
      await client.query(`INSERT INTO ludo_tournament_entry_payments(tournament_id,user_id,coins,gems) VALUES($1,$2,$3,$4) ON CONFLICT(tournament_id,user_id) DO UPDATE SET coins=EXCLUDED.coins,gems=EXCLUDED.gems,created_at=NOW()`,[tournamentId,current.id,entryCoins,entryGems]);
      await client.query(`INSERT INTO ludo_tournament_player_stats(tournament_id,user_id) VALUES($1,$2) ON CONFLICT(tournament_id,user_id) DO UPDATE SET active=TRUE,updated_at=NOW()`,[tournamentId,current.id]);
      const boardToken=randomUUID();
      await client.query(`INSERT INTO ludo_tournament_board_sessions(tournament_id,user_id,board_token,state) VALUES($1,$2,$3,'{}'::jsonb) ON CONFLICT(tournament_id,user_id) DO UPDATE SET board_token=EXCLUDED.board_token,status='active',updated_at=NOW()`,[tournamentId,current.id,boardToken]);
      if(entryCoins)await client.query("UPDATE ludo_admin_wallets SET revenue_coins=revenue_coins+$1,updated_at=NOW() WHERE id='platform'",[entryCoins]);
      if(entryGems)await client.query("UPDATE ludo_admin_wallets SET revenue_gems=revenue_gems+$1,updated_at=NOW() WHERE id='platform'",[entryGems]);
      if(entryCoins)await client.query("INSERT INTO ludo_admin_wallet_ledger(wallet_to,currency,amount,reason) VALUES('revenue','coins',$1,$2)",[entryCoins,`Tournament entry: ${t.name}`]);
      if(entryGems)await client.query("INSERT INTO ludo_admin_wallet_ledger(wallet_to,currency,amount,reason) VALUES('revenue','gems',$1,$2)",[entryGems,`Tournament entry: ${t.name}`]);
      await client.query("COMMIT");
      return NextResponse.json({ok:true,tournamentId,boardToken});
    }

    if(action==="leave"){
      const tournamentId=String(body.tournamentId||""); await client.query("BEGIN");
      const e=await client.query<any>("SELECT * FROM ludo_tournament_entries WHERE tournament_id=$1 AND user_id=$2 FOR UPDATE",[tournamentId,current.id]);
      if(!e.rowCount||e.rows[0].status!=="active"){await client.query("ROLLBACK");return NextResponse.json({error:"Active tournament entry not found."},{status:404});}
      await client.query("UPDATE ludo_tournament_entries SET status='withdrawn',eliminated_at=NOW() WHERE tournament_id=$1 AND user_id=$2",[tournamentId,current.id]);
      await client.query("UPDATE ludo_tournament_player_stats SET active=FALSE,updated_at=NOW() WHERE tournament_id=$1 AND user_id=$2",[tournamentId,current.id]);
      await client.query("UPDATE ludo_tournament_board_sessions SET status='forfeited',updated_at=NOW() WHERE tournament_id=$1 AND user_id=$2",[tournamentId,current.id]);
      await client.query("COMMIT"); return NextResponse.json({ok:true});
    }

    if(action==="save_board"){
      const tournamentId=String(body.tournamentId||""),boardToken=String(body.boardToken||""),state=body.state||{};
      const r=await client.query(`UPDATE ludo_tournament_board_sessions SET state=$1,updated_at=NOW() WHERE tournament_id=$2 AND user_id=$3 AND board_token=$4 AND status='active' RETURNING state`,[JSON.stringify(state),tournamentId,current.id,boardToken]);
      if(!r.rowCount)return NextResponse.json({error:"Tournament board session not found."},{status:404}); return NextResponse.json({ok:true,state:r.rows[0].state});
    }

    if(action==="record_win"){
      const tournamentId=String(body.tournamentId||""),boardToken=String(body.boardToken||""); await client.query("BEGIN");
      const s=await client.query<any>(`SELECT b.*,t.ends_at,t.status tournament_status FROM ludo_tournament_board_sessions b JOIN ludo_tournaments t ON t.id=b.tournament_id WHERE b.tournament_id=$1 AND b.user_id=$2 AND b.board_token=$3 FOR UPDATE`,[tournamentId,current.id,boardToken]);
      if(!s.rowCount||s.rows[0].status!=="active"){await client.query("ROLLBACK");return NextResponse.json({error:"Tournament board session is not active."},{status:409});}
      const t=s.rows[0]; if(new Date(t.ends_at)<=new Date()||!["open","live"].includes(t.tournament_status)){await client.query("ROLLBACK");return NextResponse.json({error:"Tournament is no longer active."},{status:400});}
      const stat=await client.query<any>("SELECT * FROM ludo_tournament_player_stats WHERE tournament_id=$1 AND user_id=$2 FOR UPDATE",[tournamentId,current.id]);
      if(!stat.rowCount||!stat.rows[0].active){await client.query("ROLLBACK");return NextResponse.json({error:"You are not an active participant."},{status:403});}
      const nextWins=Number(stat.rows[0].wins)+1,nextPoints=Number(stat.rows[0].points)+WIN_POINTS;
      await client.query("UPDATE ludo_tournament_player_stats SET wins=$1,points=$2,eligible=$3,score_reached_at=NOW(),updated_at=NOW() WHERE tournament_id=$4 AND user_id=$5",[nextWins,nextPoints,nextPoints>=QUALIFY_POINTS,tournamentId,current.id]);
      await client.query("UPDATE ludo_tournament_board_sessions SET wins_recorded=wins_recorded+1,updated_at=NOW() WHERE id=$1",[t.id]);
      await client.query("COMMIT"); const leaderboard=await rank(pool,tournamentId);
      return NextResponse.json({ok:true,wins:nextWins,points:nextPoints,eligible:nextPoints>=QUALIFY_POINTS,position:leaderboard.find((x:any)=>x.user_id===current.id)?.position||null,leaderboard});
    }

    return NextResponse.json({error:"Unknown tournament action."},{status:400});
  } catch(e){await client.query("ROLLBACK").catch(()=>undefined);console.error(e);return NextResponse.json({error:"Tournament action failed."},{status:500});}
  finally{client.release();}
}
