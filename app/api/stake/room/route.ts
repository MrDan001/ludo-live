import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "../../../../lib/auth-session";

type StakeEntry={hostPlayerId:string;stakeCoins:number;createdAt:number;updatedAt:number};
type GlobalState=typeof globalThis & {__ludoStakeRooms?:Map<string,StakeEntry>;__ludoStakeRoomRegister?:(code:string,hostPlayerId:string,stakeCoins:number)=>{stakeType:"free"|"paid";stakeCoins:number;paid:boolean};__ludoStakeRoomGet?:(code:string)=>{stakeType:"free"|"paid";stakeCoins:number;paid:boolean}};

function store(){
 const g=globalThis as GlobalState;
 if(!g.__ludoStakeRooms)g.__ludoStakeRooms=new Map<string,StakeEntry>();
 return g;
}
function codeOf(value:unknown){return String(value||"").trim().toUpperCase().slice(0,6)}
function amountOf(value:unknown){const n=Math.trunc(Number(value));return Number.isFinite(n)&&n>=100&&n<=10000?n:null}

export async function GET(req:NextRequest){
 const code=codeOf(new URL(req.url).searchParams.get("code"));
 if(!code)return NextResponse.json({error:"Room code is required."},{status:400});
 const g=store();
 const result=g.__ludoStakeRoomGet?.(code);
 if(result)return NextResponse.json({code,...result});
 const entry=g.__ludoStakeRooms?.get(code);
 const coins=Number(entry?.stakeCoins)||0;
 return NextResponse.json({code,stakeType:coins>0?"paid":"free",stakeCoins:coins,paid:coins>0});
}

export async function POST(req:NextRequest){
 try{
  const user=await currentUser(req);
  if(!user)return NextResponse.json({error:"Please sign in before creating a room."},{status:401});
  const body=await req.json().catch(()=>({}));
  const code=codeOf(body?.code);
  const mode=String(body?.stakeType||"free").toLowerCase();
  const amount=mode==="paid"?amountOf(body?.stakeCoins):0;
  if(code.length<4)return NextResponse.json({error:"Invalid room code."},{status:400});
  if(mode!=="free"&&mode!=="paid")return NextResponse.json({error:"Choose a free or paid room."},{status:400});
  if(mode==="paid"&&amount===null)return NextResponse.json({error:"Paid room stake must be between 100 and 10,000 coins."},{status:400});

  const g=store();
  const existing=g.__ludoStakeRooms?.get(code);
  if(existing&&existing.hostPlayerId!==String(user.id))return NextResponse.json({error:"This room already exists."},{status:409});
  const stakeCoins=mode==="paid"?Number(amount):0;
  if(stakeCoins>0&&Number(user.coins||0)<stakeCoins)return NextResponse.json({error:`You need ${stakeCoins.toLocaleString()} coins to create this paid room. Your balance is ${Number(user.coins||0).toLocaleString()}.`},{status:400});
  const register=g.__ludoStakeRoomRegister;
  const result=register?register(code,String(user.id),stakeCoins):(()=>{g.__ludoStakeRooms!.set(code,{hostPlayerId:String(user.id),stakeCoins,createdAt:existing?.createdAt||Date.now(),updatedAt:Date.now()});return{stakeType:stakeCoins>0?"paid":"free" as const,stakeCoins,paid:stakeCoins>0}})();
  return NextResponse.json({ok:true,code,...result});
 }catch(e){console.error("stake room",e);return NextResponse.json({error:"Unable to set the room stake right now."},{status:500})}
}
