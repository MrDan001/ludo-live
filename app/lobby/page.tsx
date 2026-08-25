"use client";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import AppFrame from "../_components/AppFrame";
import { AccountGateModal, useAccountGate } from "../_components/AccountGate";

type OpenRoom={code:string;players:number;roomSize:number;hostName:string};
export default function LobbyPage(){
 const [rooms,setRooms]=useState<OpenRoom[]>([]);const [connected,setConnected]=useState(false);const gate=useAccountGate();
 useEffect(()=>{const socket:Socket=io(window.location.origin,{transports:["websocket","polling"]});const refresh=(list:OpenRoom[])=>setRooms(list);socket.on("connect",()=>{setConnected(true);socket.emit("list-rooms")});socket.on("disconnect",()=>setConnected(false));socket.on("room-list",refresh);return()=>{socket.disconnect()}},[]);
 const openRoom=(href:string)=>{gate.check(()=>{window.location.href=href})};
 return <AppFrame><div style={{maxWidth:900,margin:"0 auto",paddingBottom:40}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}><div><h1 style={{fontSize:40,marginBottom:6}}>🌐 Online Players</h1><p style={{color:"#94a3b8",marginTop:0}}>See players who are waiting right now and jump into an open game.</p></div><span style={{padding:"7px 11px",borderRadius:999,background:connected?"rgba(34,197,94,.12)":"rgba(245,158,11,.12)",color:connected?"#4ade80":"#fbbf24",fontSize:12,fontWeight:900}}>{connected?"● LIVE":"○ CONNECTING"}</span></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:22}}><button onClick={()=>openRoom("/room?action=create")} style={tile}><span style={{fontSize:30}}>➕</span><b style={{display:"block",fontSize:20,marginTop:8}}>Create Game</b><small>Open your own room and wait for players.</small></button><button onClick={()=>openRoom("/room?action=join")} style={tile}><span style={{fontSize:30}}>🔑</span><b style={{display:"block",fontSize:20,marginTop:8}}>Join by Code</b><small>Enter a friend's private room code.</small></button></div>
  <section style={{marginTop:28}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{margin:0}}>🔥 Rooms waiting for players</h2><span style={{color:"#64748b",fontSize:12}}>{rooms.length} open</span></div>
   {rooms.length===0?<div style={empty}>No open rooms right now.<br/><span>Create a game and your room will appear here automatically.</span></div>:<div style={{display:"grid",gap:10}}>{rooms.map(room=><div key={room.code} style={roomCard}><div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}><div style={{width:46,height:46,borderRadius:"50%",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#1d4ed8,#22c55e)",fontSize:23}}>🎲</div><div><b style={{fontSize:16}}>{room.hostName}'s Game</b><div style={{color:"#94a3b8",fontSize:12,marginTop:3}}>Room {room.code} · {room.roomSize}-player game</div></div></div><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{color:"#4ade80",fontWeight:900,fontSize:13}}>{room.players}/{room.roomSize}</span><button onClick={()=>openRoom(`/room?action=join&code=${room.code}&size=${room.roomSize}`)} style={joinBtn}>JOIN</button></div></div>)}</div>}
  </section>
  <div style={flow}><b>Live matchmaking</b><br/><span>Create Room → Room appears online → Players join → Ready → Host starts → Live Game</span></div>
 </div><AccountGateModal open={gate.open} onClose={()=>gate.setOpen(false)}/></AppFrame>
}
const tile={border:0,cursor:"pointer",textAlign:"left" as const,textDecoration:"none",color:"#fff",padding:22,borderRadius:18,background:"linear-gradient(135deg,rgba(10,31,70,.95),rgba(8,20,43,.95))",borderColor:"rgba(96,165,250,.2)"};
const roomCard={display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:14,borderRadius:16,background:"rgba(7,18,39,.9)",border:"1px solid rgba(96,165,250,.16)"};
const joinBtn={border:0,cursor:"pointer",background:"#22c55e",color:"#04130a",padding:"10px 14px",borderRadius:10,fontWeight:950,fontSize:12};
const empty={padding:28,textAlign:"center" as const,borderRadius:18,border:"1px dashed #334155",color:"#94a3b8",lineHeight:1.8};
const flow={marginTop:22,padding:16,borderRadius:16,background:"rgba(30,41,59,.55)",color:"#cbd5e1",fontSize:13,lineHeight:1.7};
