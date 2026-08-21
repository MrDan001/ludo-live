"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import AppFrame from "../_components/AppFrame";

type ChatRoom={code:string;title:string;hostName:string;members:number;maxMembers:number;locked:boolean};
type Member={id:string;name:string;host?:boolean};
type Message={id:string;name:string;text:string;at:number};
const quick=["👋 Hi!","😂 LOL","🔥 Nice!","😮 Wow!","👏 Good move","🎉 GG","❤️","😎"];
function bumpStat(key:string){try{const s=JSON.parse(localStorage.getItem("ludo-stats")||"{}");s[key]=(s[key]||0)+1;localStorage.setItem("ludo-stats",JSON.stringify(s));window.dispatchEvent(new Event("ludo-stats-updated"))}catch{}}

function SocialContent(){
 const params=useSearchParams();const initial=params.get("tab")||"chat";const [tab,setTab]=useState(initial==="friends"?"friends":"chat");
 const [name,setName]=useState("PlayerOne");const [rooms,setRooms]=useState<ChatRoom[]>([]);const [room,setRoom]=useState<ChatRoom|null>(null);const [members,setMembers]=useState<Member[]>([]);const [messages,setMessages]=useState<Message[]>([]);const [text,setText]=useState("");const [title,setTitle]=useState("");const [code,setCode]=useState("");const [notice,setNotice]=useState("");const [connected,setConnected]=useState(false);const [socket,setSocket]=useState<Socket|null>(null);const [pendingAction,setPendingAction]=useState<"create"|"join"|null>(null);
 useEffect(()=>{const s=io(window.location.origin,{transports:["websocket","polling"]});setSocket(s);s.on("connect",()=>{setConnected(true);s.emit("list-chat-rooms")});s.on("disconnect",()=>setConnected(false));s.on("chat-room-list",setRooms);s.on("chat-room-joined",(payload)=>{if(pendingAction==="create")bumpStat("chatRoomsCreated");if(pendingAction==="join")bumpStat("chatRoomsJoined");setPendingAction(null);setRoom({code:payload.code,title:payload.title,hostName:name,members:payload.members.length,maxMembers:20,locked:false});setMembers(payload.members);setMessages(payload.messages||[]);setNotice("")});s.on("chat-room-members",(m:Member[])=>{setMembers(m);setRoom(r=>r?{...r,members:m.length}:r)});s.on("chat-room-message",(m:Message)=>{setMessages(x=>[...x,m].slice(-100));if(m.id===s.id)bumpStat("messagesSent")});s.on("chat-room-error",(m:string)=>{setPendingAction(null);setNotice(m)});s.on("chat-kicked",()=>{setRoom(null);setMembers([]);setMessages([]);setNotice("You were removed from that chat room by its host.")});return()=>{s.disconnect()}},[name,pendingAction]);
 const create=()=>{if(!socket||!connected)return;setPendingAction("create");socket.emit("create-chat-room",{title:title.trim()||`${name}'s Chat`,name});setTitle("")};
 const join=(roomCode:string)=>{if(!socket)return;setPendingAction("join");socket.emit("join-chat-room",{roomCode,name})};
 const joinCode=()=>{if(code.trim())join(code.trim().toUpperCase())};
 const leave=()=>{socket?.emit("leave-chat-room");setRoom(null);setMembers([]);setMessages([])};
 const send=(value=text)=>{const v=value.trim();if(!v||!room)return;socket?.emit("chat-room-message",{text:v});setText("")};
 const kick=(id:string)=>socket?.emit("kick-chat-member",id);
 const isHost=!!members.find(m=>m.name===name&&m.host);
 return <AppFrame back="/home"><div style={{maxWidth:980,margin:"0 auto",paddingBottom:50}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h1 style={{fontSize:36,margin:"0 0 5px"}}>💬 Ludo Chat</h1><p style={{color:"#94a3b8",margin:0}}>Create or join live rooms. Every room supports up to 20 players.</p></div><span style={{padding:"7px 11px",borderRadius:999,background:connected?"#052e16":"#3f2204",color:connected?"#4ade80":"#fbbf24",fontSize:12,fontWeight:900}}>{connected?"● LIVE":"○ CONNECTING"}</span></header>
  <div style={tabs}><button onClick={()=>setTab("chat")} style={{...tab,background:tab==="chat"?"#2563eb":"transparent",color:tab==="chat"?"#fff":"#94a3b8"}}>Chat Rooms</button><button onClick={()=>setTab("friends")} style={{...tab,background:tab==="friends"?"#2563eb":"transparent",color:tab==="friends"?"#fff":"#94a3b8"}}>Friends</button></div>
  {tab==="friends"?<section style={panel}><h2>👥 Find players</h2><p style={muted}>Players waiting to play are shown in the live lobby. Invite a friend by sharing your room code.</p><Link href="/lobby" style={primary}>🌐 OPEN ONLINE PLAYERS</Link><Link href="/lobby" style={{...primary,marginLeft:8,background:"#2563eb"}}>＋ CREATE GAME ROOM</Link></section>:<>
   {!room&&<section style={panel}><h2 style={{marginTop:0}}>World chat rooms</h2><div style={createGrid}><div><label style={label}>Your name<input value={name} onChange={e=>setName(e.target.value)} style={input}/></label><label style={label}>Room name<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Weekend Ludo" style={input}/></label><button onClick={create} style={primary}>＋ CREATE CHAT ROOM</button></div><div style={joinBox}><b>Join by invite code</b><p style={muted}>A friend can send you the room code.</p><div style={{display:"flex",gap:7}}><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} style={{...input,margin:0}}/><button onClick={joinCode} style={primary}>JOIN</button></div></div></div><div style={{marginTop:24,display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{margin:0}}>🟢 Rooms open now</h3><span style={muted}>{rooms.length} available</span></div><div style={{display:"grid",gap:9,marginTop:10}}>{rooms.length===0?<div style={empty}>No public chat rooms yet. Create the first one.</div>:rooms.map(r=><div key={r.code} style={roomCard}><div><b>{r.title}</b><div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>Host: {r.hostName} · Code {r.code}</div></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:"#4ade80",fontSize:12,fontWeight:900}}>{r.members}/20</span><button onClick={()=>join(r.code)} disabled={r.members>=20} style={joinBtn}>JOIN</button></div></div>)}</div></section>}
   {room&&<section style={panel}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><div style={{color:"#60a5fa",fontSize:12,fontWeight:900}}>CHAT ROOM</div><h2 style={{margin:"4px 0"}}>{room.title}</h2><span style={{color:"#94a3b8",fontSize:12}}>Code <b>{room.code}</b> · {members.length}/20 players</span></div><div><button onClick={()=>navigator.clipboard?.writeText(room.code)} style={secondary}>📋 INVITE</button><button onClick={leave} style={{...secondary,marginLeft:7,background:"#7f1d1d"}}>LEAVE</button></div></div><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 220px",gap:14,marginTop:16}}><div style={chatBox}>{messages.map((m,i)=><div key={`${m.at}-${i}`} style={bubble}><b>{m.name}</b><span style={{display:"block",marginTop:3}}>{m.text}</span><small style={{display:"block",marginTop:4,color:"#64748b"}}>{new Date(m.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div>)}</div><aside style={membersBox}><b>People here</b><div style={{display:"grid",gap:7,marginTop:10}}>{members.map(m=><div key={m.id} style={memberRow}><span>{m.host?"👑 ":""}{m.name}{m.name===name?" (you)":""}</span>{isHost&&!m.host&&<button onClick={()=>kick(m.id)} style={kickBtn}>Kick</button>}</div>)}</div></aside></div><div style={quickRow}>{quick.map(q=><button key={q} onClick={()=>send(q)} style={quickBtn}>{q}</button>)}</div><div style={{display:"flex",gap:7}}><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a message…" style={{...input,margin:0}}/><button onClick={()=>send()} style={sendBtn}>SEND</button></div></section>}
   {notice&&<div style={{marginTop:12,padding:12,borderRadius:12,background:"#3b1d05",color:"#fbbf24"}}>{notice}</div>}
  </>}
 </div></AppFrame>
}
export default function SocialPage(){return <Suspense fallback={<AppFrame back="/home"><p>Loading chat…</p></AppFrame>}><SocialContent/></Suspense>}
const tabs={display:"flex",gap:6,marginTop:14,padding:5,borderRadius:14,background:"#071225"};
const tab={border:0,borderRadius:10,padding:"10px 15px",fontWeight:900,cursor:"pointer"};
const panel={marginTop:16,padding:18,borderRadius:20,background:"linear-gradient(145deg,#071b3c,#050d20)",border:"1px solid rgba(96,165,250,.18)"};
const createGrid={display:"grid",gridTemplateColumns:"1fr 1fr",gap:14};
const joinBox={padding:15,borderRadius:15,background:"#071225",border:"1px solid #1e3a5f"};
const input={width:"100%",boxSizing:"border-box" as const,padding:12,borderRadius:10,border:"1px solid #334155",background:"#071225",color:"#fff",marginTop:6};
const label={display:"grid",gap:4,color:"#cbd5e1",fontSize:13,fontWeight:800,marginBottom:10};
const primary={display:"inline-block",border:0,borderRadius:11,padding:"11px 15px",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",fontWeight:900,textDecoration:"none",cursor:"pointer"};
const secondary={border:0,borderRadius:10,padding:"9px 11px",background:"#1e3a5f",color:"#fff",fontWeight:900,cursor:"pointer"};
const roomCard={display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:13,borderRadius:14,background:"#071225",border:"1px solid rgba(96,165,250,.15)"};
const joinBtn={border:0,borderRadius:9,padding:"9px 12px",background:"#22c55e",color:"#03120a",fontWeight:950,cursor:"pointer"};
const empty={padding:22,borderRadius:14,border:"1px dashed #334155",textAlign:"center" as const,color:"#94a3b8"};
const muted={color:"#94a3b8",fontSize:12};
const chatBox={minHeight:360,maxHeight:500,overflowY:"auto" as const,display:"grid",alignContent:"start",gap:9,padding:12,borderRadius:14,background:"#020b1c"};
const bubble={padding:"10px 12px",borderRadius:13,background:"#10264b",width:"fit-content",maxWidth:"90%"};
const membersBox={padding:13,borderRadius:14,background:"#071225",border:"1px solid #1e3a5f",maxHeight:500,overflowY:"auto" as const};
const memberRow={display:"flex",justifyContent:"space-between",gap:5,alignItems:"center",padding:"8px 9px",borderRadius:9,background:"#0b1730",fontSize:12};
const kickBtn={border:0,borderRadius:7,padding:"5px 7px",background:"#7f1d1d",color:"#fff",fontSize:10,fontWeight:900,cursor:"pointer"};
const quickRow={display:"flex",gap:6,flexWrap:"wrap" as const,margin:"10px 0"};
const quickBtn={border:"1px solid #334155",borderRadius:999,padding:"7px 10px",background:"#0b1730",color:"#fff",cursor:"pointer"};
const sendBtn={border:0,borderRadius:10,padding:"0 17px",background:"#2563eb",color:"#fff",fontWeight:900};
