import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { ensureTournamentV2Schema } from "../_schema";

async function user(q:NextRequest){const token=q.cookies.get("ludo_session")?.value;if(!token)return null;const hash=createHash("sha256").update(token).digest("hex");const r=await pool.query<any>("SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1",[hash]);return r.rows[0]||null}

export async function GET(q:NextRequest){try{await ensureAuthSchema();await ensureTournamentV2Schema();const current=await user(q),tournamentId=q.nextUrl.searchParams.get("tournament");if(!current||current.is_guest||current.is_banned)return NextResponse.json({error:"You must be signed in."},{status:401});if(!tournamentId)return NextResponse.json({error:"Tournament is required."},{status:400});const r=await pool.query<any>(`SELECT b.board_token,b.state,b.status FROM ludo_tournament_board_sessions b JOIN ludo_tournament_entries e ON e.tournament_id=b.tournament_id AND e.user_id=b.user_id WHERE b.tournament_id=$1 AND b.user_id=$2 AND e.status='active' AND b.status='active' LIMIT 1`,[tournamentId,current.id]);if(!r.rowCount)return NextResponse.json({state:null});return NextResponse.json({boardToken:r.rows[0].board_token,state:r.rows[0].state||null});}catch(e){console.error(e);return NextResponse.json({error:"Tournament board session unavailable."},{status:500})}}
