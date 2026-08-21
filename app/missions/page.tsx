"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppFrame from "../_components/AppFrame";

type Stats={gameRoomsEntered:number;spinsUsed:number;messagesSent:number;chatRoomsJoined:number;chatRoomsCreated:number};
const defaults:Stats={gameRoomsEntered:0,spinsUsed:0,messagesSent:0,chatRoomsJoined:0,chatRoomsCreated:0};
type Mission={id:string;title:string;description:string;target:number;reward:string;value:(s:Stats)=>number};
const missions:Mission[]=[
 {id:"games",title:"Enter 3 game rooms",description:"Join or create three live Ludo game rooms.",target:3,reward:"1,000 🪙",value:s=>s.gameRoomsEntered},
 {id:"spin2",title:"Use the spin wheel 2 times",description:"Complete two real spins and collect the results.",target:2,reward:"500 🪙",value:s=>s.spinsUsed},
 {id:"chat10",title:"Send 10 chat messages",description:"Send messages or quick emojis in live chat rooms.",target:10,reward:"750 🪙",value:s=>s.messagesSent},
 {id:"chatjoin2",title:"Join 2 chat rooms",description:"Visit two different live community chat rooms.",target:2,reward:"1,000 🪙",value:s=>s.chatRoomsJoined},
 {id:"chatcreate",title:"Create a chat room",description:"Create your own room and invite other players.",target:1,reward:"5 💎",value:s=>s.chatRoomsCreated},
];
function readStats(){try{return {...defaults,...JSON.parse(localStorage.getItem("ludo-stats")||"{}")}}catch{return defaults}}
export default function MissionsPage(){
 const [stats,setStats]=useState<Stats>(defaults);const [claimed,setClaimed]=useState<string[]>([]);const [message,setMessage]=useState("");
 const read=()=>{setStats(readStats());try{setClaimed(JSON.parse(localStorage.getItem("ludo-claimed-missions")||"[]"))}catch{setClaimed([])}};
 useEffect(()=>{read();window.addEventListener("ludo-stats-updated",read);window.addEventListener("storage",read);return()=>{window.removeEventListener("ludo-stats-updated",read);window.removeEventListener("storage",read)}},[]);
 const progress=useMemo(()=>missions.map(m=>{const value=Math.min(m.target,m.value(stats));return {...m,value,complete:value>=m.target,claimed:claimed.includes(m.id)}}),[stats,claimed]);
 const claim=(m:typeof progress[number])=>{if(!m.complete||m.claimed)return;const next=[...claimed,m.id];setClaimed(next);localStorage.setItem("ludo-claimed-missions",JSON.stringify(next));setMessage(`${m.reward} reward unlocked for ${m.title}.`);};
 return <AppFrame back="/home"><div style={{maxWidth:760,margin:"0 auto",paddingBottom:40}}><header><div style={{color:"#60a5fa",fontWeight:950,letterSpacing:2,fontSize:12}}>REAL PLAYER OBJECTIVES</div><h1 style={{fontSize:38,margin:"5px 0"}}>🎯 Missions</h1><p style={{color:"#94a3b8",marginTop:0}}>Nothing can be claimed early. Progress comes from actions you actually perform.</p></header><div style={{display:"grid",gap:12,marginTop:20}}>{progress.map(m=><article key={m.id} style={{padding:16,borderRadius:18,background:"linear-gradient(145deg,#071b3c,#050d20)",border:`1px solid ${m.complete?"rgba(34,197,94,.45)":"rgba(96,165,250,.16)"}`}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start"}}><div><h2 style={{margin:"0 0 5px",fontSize:19}}>{m.title}</h2><p style={{margin:0,color:"#94a3b8",fontSize:13}}>{m.description}</p></div><strong style={{color:m.complete?"#4ade80":"#facc15",whiteSpace:"nowrap"}}>{m.reward}</strong></div><div style={{marginTop:14,height:10,borderRadius:99,background:"#14223c",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round((m.value/m.target)*100)}%`,background:m.complete?"#22c55e":"#2563eb",borderRadius:99,transition:"width .35s"}}/></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:9}}><span style={{fontSize:12,color:"#94a3b8"}}>{m.value.toLocaleString()} / {m.target.toLocaleString()}</span><button disabled={!m.complete||m.claimed} onClick={()=>claim(m)} style={{border:0,borderRadius:10,padding:"9px 14px",fontWeight:900,color:"#fff",background:m.claimed?"#334155":m.complete?"#16a34a":"#1e293b",cursor:m.complete&&!m.claimed?"pointer":"not-allowed"}}>{m.claimed?"CLAIMED":m.complete?"CLAIM REWARD":"LOCKED"}</button></div></article>)}</div>{message&&<div style={{marginTop:14,padding:12,borderRadius:12,background:"#052e16",color:"#86efac"}}>{message}</div>}<Link href="/lobby" style={{display:"inline-block",marginTop:16,padding:"11px 16px",borderRadius:11,background:"#2563eb",color:"#fff",textDecoration:"none",fontWeight:900}}>PLAY TO COMPLETE MISSIONS</Link></div> </AppFrame>;
}
