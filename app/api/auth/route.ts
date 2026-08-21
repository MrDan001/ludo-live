import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { pool, ensureAuthSchema } from "./_db";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "ludo_session";
const SESSION_DAYS = 30;

type UserRow = {
 id:string; username:string; email:string|null; password_hash:string|null; created_at:string;
 coins:number; gems:number; xp:number; level:number; is_guest:boolean;
};

function publicUser(u:UserRow){
 return {id:u.id,username:u.username,email:u.email??"",passwordHash:"",createdAt:new Date(u.created_at).getTime(),coins:u.coins,gems:u.gems,xp:u.xp,level:u.level,isGuest:u.is_guest};
}
function tokenHash(token:string){return createHash("sha256").update(token).digest("hex");}
async function hashPassword(password:string){
 const salt=randomBytes(16).toString("hex");
 const derived=await scrypt(password,salt,64) as Buffer;
 return `${salt}:${derived.toString("hex")}`;
}
async function verifyPassword(password:string,stored:string){
 const [salt,hex]=stored.split(":");
 if(!salt||!hex)return false;
 const derived=await scrypt(password,salt,64) as Buffer;
 const expected=Buffer.from(hex,"hex");
 return expected.length===derived.length && timingSafeEqual(expected,derived);
}
async function startSession(userId:string,response:NextResponse){
 const token=randomBytes(32).toString("hex");
 const expires=new Date(Date.now()+SESSION_DAYS*86400000);
 await pool.query("INSERT INTO ludo_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)",[tokenHash(token),userId,expires]);
 response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires});
}
async function currentUser(request:NextRequest){
 const token=request.cookies.get(SESSION_COOKIE)?.value;
 if(!token)return null;
 const result=await pool.query<UserRow>(`SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`,[tokenHash(token)]);
 return result.rows[0]??null;
}

export async function POST(request:NextRequest){
 try{
  await ensureAuthSchema();
  const body=await request.json();
  const action=String(body?.action||"");
  if(action==="register"){
   const username=String(body.username||"").trim().slice(0,24);
   const email=String(body.email||"").trim().toLowerCase();
   const password=String(body.password||"");
   if(username.length<3)return NextResponse.json({error:"Username must be at least 3 characters."},{status:400});
   if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Enter a valid email address."},{status:400});
   if(password.length<6)return NextResponse.json({error:"Password must be at least 6 characters."},{status:400});
   const exists=await pool.query("SELECT id FROM ludo_users WHERE LOWER(email)=LOWER($1) LIMIT 1",[email]);
   if(exists.rowCount)return NextResponse.json({error:"An account already exists with that email."},{status:409});
   const usernameExists=await pool.query("SELECT id FROM ludo_users WHERE LOWER(username)=LOWER($1) LIMIT 1",[username]);
   if(usernameExists.rowCount)return NextResponse.json({error:"That username is already taken."},{status:409});
   const id=randomUUID();
   const passwordHash=await hashPassword(password);
   const result=await pool.query<UserRow>(`INSERT INTO ludo_users(id,username,email,password_hash) VALUES($1,$2,$3,$4) RETURNING *`,[id,username,email,passwordHash]);
   const response=NextResponse.json({user:publicUser(result.rows[0])});
   await startSession(id,response);
   return response;
  }
  if(action==="login"){
   const identifier=String(body.identifier||"").trim().toLowerCase();
   const password=String(body.password||"");
   const result=await pool.query<UserRow>(`SELECT * FROM ludo_users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($1) LIMIT 1`,[identifier]);
   const user=result.rows[0];
   if(!user||user.is_guest||!user.password_hash||!(await verifyPassword(password,user.password_hash)))return NextResponse.json({error:"Incorrect account details."},{status:401});
   const response=NextResponse.json({user:publicUser(user)});
   await startSession(user.id,response);
   return response;
  }
  if(action==="guest"){
   const id=randomUUID();
   const username=`Guest${Math.floor(1000+Math.random()*9000)}`;
   const result=await pool.query<UserRow>(`INSERT INTO ludo_users(id,username,coins,gems,is_guest) VALUES($1,$2,1000,10,TRUE) RETURNING *`,[id,username]);
   const response=NextResponse.json({user:publicUser(result.rows[0])});
   await startSession(id,response);
   return response;
  }
  if(action==="logout"){
   const token=request.cookies.get(SESSION_COOKIE)?.value;
   if(token)await pool.query("DELETE FROM ludo_sessions WHERE token_hash=$1",[tokenHash(token)]);
   const response=NextResponse.json({ok:true});
   response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
   return response;
  }
  return NextResponse.json({error:"Unknown auth action."},{status:400});
 }catch(error){
  console.error("Auth error",error);
  return NextResponse.json({error:"Authentication service is temporarily unavailable."},{status:500});
 }
}

export async function GET(request:NextRequest){
 try{
  await ensureAuthSchema();
  const user=await currentUser(request);
  if(!user)return NextResponse.json({user:null});
  return NextResponse.json({user:publicUser(user)});
 }catch(error){
  console.error("Auth session error",error);
  return NextResponse.json({user:null},{status:500});
 }
}
