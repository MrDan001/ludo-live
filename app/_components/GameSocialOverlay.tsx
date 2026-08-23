"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import LiveSocial from "./LiveSocial";

export default function GameSocialOverlay(){
 const pathname=usePathname(); const params=useSearchParams(); const room=params.get("room"); const name=params.get("name")||"Player"; const host=params.get("host")==="1"; const roomSize=Number(params.get("size")||4)===2?2:4; const [open,setOpen]=useState(false);
 const supported=(pathname==="/game"&&!!room)||(pathname==="/game-online"&&!!room);
 if(!supported)return null;
 return <div style={{position:"fixed",right:14,bottom:14,zIndex:1000,fontFamily:"Arial,Helvetica,sans-serif"}}>
  {open&&<div style={{width:"min(92vw,430px)",maxHeight:"72vh",overflowY:"auto",marginBottom:10,padding:8,borderRadius:20,background:"rgba(2,6,23,.96)",boxShadow:"0 18px 60px rgba(0,0,0,.45)",border:"1px solid rgba(148,163,184,.2)"}}><LiveSocial roomCode={room!} name={name} host={host} roomSize={roomSize} compact /></div>}
  <button onClick={()=>setOpen(v=>!v)} style={{width:58,height:58,borderRadius:"50%",border:"2px solid rgba(255,255,255,.7)",background:open?"#dc2626":"#2563eb",color:"#fff",fontSize:24,cursor:"pointer",boxShadow:"0 7px 22px rgba(0,0,0,.35)"}} aria-label="Open game chat and voice">{open?"×":"💬"}</button>
 </div>;
}
