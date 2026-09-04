import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "../../../../lib/auth-session";
import {getRoomStake,registerRoomStake} from "../../../../lib/multiplayerStake";

function codeOf(value:unknown){return String(value||"").trim().toUpperCase().slice(0,32)}
function amountOf(value:unknown){const n=Math.trunc(Number(value));return Number.isFinite(n)&&n>=100&&n<=10000?n:null}

export async function GET(req:NextRequest){
 const code=codeOf(new URL(req.url).searchParams.get("code"));
 if(!code)return NextResponse.json({error:"Room code is required."},{status:400});
 return NextResponse.json({code,...getRoomStake(code)});
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
  const existing=getRoomStake(code);
  if(existing.paid&&existing.hostPlayerId!==String(user.id))return NextResponse.json({error:"This room already exists."},{status:409});
  const stakeCoins=mode==="paid"?Number(amount):0;
  if(stakeCoins>0&&Number(user.coins||0)<stakeCoins)return NextResponse.json({error:`You need ${stakeCoins.toLocaleString()} coins to create this paid room. Your balance is ${Number(user.coins||0).toLocaleString()}.`},{status:400});
  const result=registerRoomStake(code,String(user.id),stakeCoins);
  return NextResponse.json({ok:true,code,...result});
 }catch(e){console.error("stake room",e);return NextResponse.json({error:"Unable to set the room stake right now."},{status:500})}
}
