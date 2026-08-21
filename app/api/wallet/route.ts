import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "../../../lib/auth-session";
import {ensureAuthSchema,pool} from "../auth/_db";
export async function GET(req:NextRequest){try{await ensureAuthSchema();const u=await currentUser(req);if(!u)return NextResponse.json({user:null,wallet:null},{status:401});const r=await pool.query("SELECT coins,gems FROM ludo_users WHERE id=$1 LIMIT 1",[u.id]);const row=r.rows[0];if(!row)return NextResponse.json({user:null,wallet:null},{status:401});return NextResponse.json({wallet:{coins:Number(row.coins)||0,gems:Number(row.gems)||0}})}catch(e){console.error("Wallet error",e);return NextResponse.json({error:"Unable to load wallet."},{status:500})}}
