"use client";
import {useState} from "react";
import AppFrame from "../_components/AppFrame";
import FreePlayRoom from "../_components/FreePlayRoom";
import {AccountGateModal,useAccountGate} from "../_components/AccountGate";

export default function FreePlayPage(){
 const [mode,setMode]=useState<"create"|"join">("create"),[code,setCode]=useState(""),[players,setPlayers]=useState<2|4>(2),[name,setName]=useState(""),[room,setRoom]=useState<{code:string;host:boolean}|null>(null),[notice,setNotice]=useState("");const gate=useAccountGate();
 const create=()=>{const c=Math.random().toString(36).slice(2,8).toUpperCase();setRoom({code:c,host:true})};
 const join=()=>{const c=code.trim().toUpperCase();if(c.length<4){setNotice("Enter the Free Play room code.");return}setRoom({code:c,host:false})};
 if(room)return <FreePlayRoom roomCode={room.code} name={name.trim()||"Player"} roomSize={players} host={room.host} onLeave={()=>setRoom(null)}/>;
 return <AppFrame back="/lobby"><main style={{maxWidth:560,margin:"0 auto",padding:"20px 12px",color:"#fff"}}><div style={{padding:20,borderRadius:22,background:"linear-gradient(135deg,#0f3b2a,#071b2b)",border:"1px solid rgba(74,222,128,.35)"}}><small style={{fontWeight:900,letterSpacing:2,opacity:.75}}>FREE PLAY</small><h1 style={{margin:"6px 0",fontSize:32}}>🎮 No-Stakes Ludo</h1><p style={{margin:0,color:"#a7f3d0"}}>Multiplayer Ludo without coins or stake locking.</p></div><div style={{display:"flex",gap:8,marginTop:18}}><button onClick={()=>setMode("create")} style={{...tab,opacity:mode==="create"?1:.55}}>Create Room</button><button onClick={()=>setMode("join")} style={{...tab,opacity:mode==="join"?1:.55}}>Join Room</button></div><label style={label}>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={input}/></label>{mode==="join"&&<label style={label}>Room code<input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" style={input}/></label>}<label style={label}>Players<select value={players} onChange={e=>setPlayers(Number(e.target.value)===4?4:2)} style={input}><option value="2">2 Players</option><option value="4">4 Players</option></select></label><div style={info}>🎮 <b>Free Play:</b> no coins, no stakes. The normal multiplayer dice, moves, sounds and win rules are used.</div><button onClick={()=>gate.check(mode==="create"?create:join)} style={primary}>{mode==="create"?"CREATE FREE ROOM":"JOIN FREE ROOM"}</button>{notice&&<p style={{color:"#fbbf24"}}>{notice}</p>}<AccountGateModal open={gate.open} onClose={()=>gate.setOpen(false)}/></main></AppFrame>;
}
const label={display:"grid",gap:8,marginTop:16,color:"#cbd5e1",fontWeight:700};
const input={width:"100%",boxSizing:"border-box" as const,padding:14,borderRadius:12,border:"1px solid #334155",background:"#0f172a",color:"#fff",fontSize:16};
const tab={flex:1,border:0,cursor:"pointer",padding:12,borderRadius:10,background:"#1e293b",color:"#fff",fontWeight:900};
const primary={marginTop:18,width:"100%",border:0,cursor:"pointer",padding:14,borderRadius:12,background:"#2563eb",color:"#fff",fontWeight:950,fontSize:16};
const info={marginTop:16,padding:13,borderRadius:12,background:"rgba(37,99,235,.1)",color:"#bfdbfe",fontSize:13,lineHeight:1.6};
