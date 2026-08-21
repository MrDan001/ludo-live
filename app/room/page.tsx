"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppFrame from "../_components/AppFrame";
import LiveSocial from "../_components/LiveSocial";

type Room={code:string;players:number;host:boolean;name:string};
function makeCode(){return Math.random().toString(36).slice(2,8).toUpperCase()}

function RoomContent(){
 const params=useSearchParams(); const action=params.get("action")||"create";
 const [room,setRoom]=useState<Room|null>(null); const [players,setPlayers]=useState("4"); const [code,setCode]=useState(""); const [name,setName]=useState("Player 1"); const [notice,setNotice]=useState("");
 const create=()=>{const r={code:makeCode(),players:Number(players),host:true,name:name.trim()||"Player 1"};localStorage.setItem("ludo-room",JSON.stringify(r));setRoom(r)};
 const join=()=>{const c=code.trim().toUpperCase();if(c.length<4){setNotice("Enter the room code.");return}const r={code:c,players:4,host:false,name:name.trim()||"Player"};localStorage.setItem("ludo-room",JSON.stringify(r));setRoom(r)};
 const start=()=>{window.location.href=`/?room=${encodeURIComponent(room!.code)}&name=${encodeURIComponent(room!.name)}`};
 if(room)return <AppFrame back="/lobby"><div style={{maxWidth:900,margin:"0 auto"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h1 style={{fontSize:38,marginBottom:4}}>Room Lobby</h1><p style={{color:"#94a3b8",marginTop:0}}>Share the code and wait for everyone to get ready.</p></div><div style={{textAlign:"right"}}><small style={{color:"#64748b"}}>ROOM ID</small><div style={{fontSize:30,fontWeight:950,letterSpacing:5}}>{room.code}</div><button onClick={()=>navigator.clipboard?.writeText(room.code)} style={copyBtn}>📋 Copy code</button></div></div>
   <div style={{marginTop:18,padding:18,borderRadius:18,background:"linear-gradient(135deg,#071c45,#0b1630)",border:"1px solid rgba(59,130,246,.22)"}}><div style={{fontWeight:900,fontSize:18}}>🎙️ Live room</div><p style={{color:"#94a3b8",marginBottom:0}}>Voice chat and quick text messages are live across devices. Allow microphone access when you tap Mic On.</p></div>
   <LiveSocial roomCode={room.code} name={room.name} host={room.host} roomSize={room.players} onStart={start}/>
   <div style={{marginTop:12}}><Link href="/lobby" style={leaveBtn}>Leave Room</Link></div>
 </div>;
 return <AppFrame back="/lobby"><div style={{maxWidth:520,margin:"0 auto"}}><h1 style={{fontSize:38}}>{action==="join"?"Join a Game":"Create a Game"}</h1><p style={{color:"#94a3b8"}}>Real-time voice and chat will be available inside the room.</p>
   <label style={label}>Your name<input value={name} onChange={e=>setName(e.target.value)} style={input}/></label>
   {action==="join"?<label style={label}>Room code<input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} style={input}/></label>:<label style={label}>Number of players<select value={players} onChange={e=>setPlayers(e.target.value)} style={input}><option value="2">2 Players</option><option value="4">4 Players</option></select></label>}
   <button onClick={action==="join"?join:create} style={primary}>{action==="join"?"Join Room":"Create Room"}</button>{notice&&<p style={{color:"#fbbf24"}}>{notice}</p>}
 </div></AppFrame>
}
export default function RoomPage(){return <Suspense fallback={<AppFrame back="/lobby"><p>Loading room…</p></AppFrame>}><RoomContent/></Suspense>}
const label={display:"grid",gap:8,marginBottom:16,color:"#cbd5e1",fontWeight:700};
const input={width:"100%",boxSizing:"border-box" as const,padding:14,borderRadius:12,border:"1px solid #334155",background:"#0f172a",color:"#fff",fontSize:16};
const primary={border:0,cursor:"pointer",padding:"13px 18px",borderRadius:12,background:"#22c55e",color:"#fff",fontWeight:900,fontSize:16};
const copyBtn={border:"1px solid #334155",background:"#0f172a",color:"#fff",borderRadius:9,padding:"7px 10px",cursor:"pointer"};
const leaveBtn={display:"inline-block",padding:"10px 14px",borderRadius:10,background:"#7f1d1d",color:"#fff",textDecoration:"none",fontWeight:800};
