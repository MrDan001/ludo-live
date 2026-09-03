"use client";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import AppFrame from "../_components/AppFrame";
import { AccountGateModal, useAccountGate } from "../_components/AccountGate";

type OpenRoom={code:string;players:number;roomSize:number;hostName:string;stakeType?:"free"|"paid";stakeCoins?:number;paid?:boolean};
export default function LobbyPage(){
 const [rooms,setRooms]=useState<OpenRoom[]>([]);const [connected,setConnected]=useState(false);const [walletCoins,setWalletCoins]=useState<number|null>(null);const gate=useAccountGate();
 useEffect(()=>{let mounted=true;(async()=>{try{const r=await fetch("/api/auth",{cache:"no-store"});const d=await r.json();if(mounted)setWalletCoins(Number.isFinite(Number(d?.user?.coins))?Number(d.user.coins):null)}catch{}})();const socket:Socket=io(window.location.origin,{transports:["websocket","polling"]});const refresh=(list:OpenRoom[])=>setRooms((Array.isArray(list)?list:[]).filter(room=>Number(room.players)>0&&Number(room.players)<Number(room.roomSize)));socket.on("connect",()=>{setConnected(true);socket.emit("list-rooms")});socket.on("disconnect",()=>setConnected(false));socket.on("room-list",refresh);return()=>{mounted=false;socket.disconnect()}},[]);
 const openRoom=(href:string)=>{gate.check(()=>{window.location.href=href})};
 const afford=(room:OpenRoom)=>!room.paid||Number(room.stakeCoins||0)<=0||walletCoins===null||walletCoins>=Number(room.stakeCoins||0);
 return <AppFrame><div style={{maxWidth:900,margin:"0 auto",paddingBottom:40}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}><div><h1 style={{fontSize:40,marginBottom:6}}>🌐 Online Players</h1><p style={{color:"#94a3b8",marginTop:0}}>See players who are waiting right now and jump into an open game.</p></div><span style={{padding:"7px 11px",borderRadius:999,background:connected?"rgba(34,197,94,.12)":"rgba(245,158,11,.12)",color:connected?"#4ade80":"#fbbf24",fontSize:12,fontWeight:900}}>{connected?"● LIVE":"○ CONNECTING"}</span></div>

  <section style={{marginTop:22}}>
   <div style={{marginBottom:12}}><h2 style={{margin:"0 0 4px"}}>🎮 Create or join a game</h2><p style={{margin:0,color:"#64748b",fontSize:13}}>Create a room for friends or join an existing room.</p></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
    <button onClick={()=>openRoom("/room?action=create")} style={tile}><span style={{fontSize:30}}>➕</span><b style={{display:"block",fontSize:20,marginTop:8}}>Create Game</b><small>Choose a free room or set a coin stake for your room.</small></button>
    <button onClick={()=>openRoom("/room?action=join")} style={tile}><span style={{fontSize:30}}>🔑</span><b style={{display:"block",fontSize:20,marginTop:8}}>Join by Code</b><small>Enter a friend's private room code.</small></button>
   </div>
  </section>

  <section style={freeSection}>
   <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}>
    <div><div style={freeLabel}>🎮 FREE PLAY</div><h2 style={{margin:"5px 0 4px",fontSize:26}}>Play without coins</h2><p style={{margin:0,color:"#a7f3d0",fontSize:13}}>A completely free Ludo mode with no stakes or paid rooms.</p></div>
    <button onClick={()=>openRoom("/free-play")} style={freeButton}>PLAY FREE →</button>
   </div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:16,color:"#86efac",fontSize:12,fontWeight:800}}><span>✓ Free</span><span>✓ No stakes</span><span>✓ Live multiplayer</span><span>✓ Same Ludo rules</span></div>
  </section>

  <section style={{marginTop:28}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h2 style={{margin:0}}>🔥 Rooms waiting for players</h2><span style={{color:"#64748b",fontSize:12}}>{rooms.length} open</span></div>
   {rooms.length===0?<div style={empty}>No open rooms right now.<br/><span>Create a game and your room will appear here automatically.</span></div>:<div style={{display:"grid",gap:10}}>{rooms.map(room=>{const paid=!!room.paid&&Number(room.stakeCoins||0)>0;const canAfford=afford(room);return <div key={room.code} style={roomCard}>
    <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}><div style={{width:46,height:46,borderRadius:"50%",display:"grid",placeItems:"center",background:paid?"linear-gradient(135deg,#7c3aed,#f59e0b)":"linear-gradient(135deg,#1d4ed8,#22c55e)",fontSize:23}}>{paid?"🪙":"🎲"}</div><div><div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}><b style={{fontSize:16}}>{room.hostName}'s Game</b><span style={paid?paidBadge:freeBadge}>{paid?`PAID · ${Number(room.stakeCoins).toLocaleString()} COINS`:"FREE"}</span></div><div style={{color:"#94a3b8",fontSize:12,marginTop:3}}>Room {room.code} · {room.roomSize}-player game</div></div></div>
    <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{color:"#4ade80",fontWeight:900,fontSize:13}}>{room.players}/{room.roomSize}</span><button disabled={!canAfford} onClick={()=>openRoom(`/room?action=join&code=${room.code}&size=${room.roomSize}`)} style={{...joinBtn,opacity:canAfford?1:.45,cursor:canAfford?"pointer":"not-allowed"}}>{paid&&!canAfford?"LOW COINS":"JOIN"}</button></div>
   </div>})}</div>}
  </section>
 </div><AccountGateModal open={gate.open} onClose={()=>gate.setOpen(false)}/></AppFrame>
}
const tile={border:0,cursor:"pointer",textAlign:"left" as const,textDecoration:"none",color:"#fff",padding:22,borderRadius:18,background:"linear-gradient(135deg,rgba(10,31,70,.95),rgba(8,20,43,.95))",borderColor:"rgba(96,165,250,.2)"};
const freeSection={marginTop:22,padding:22,borderRadius:20,background:"linear-gradient(135deg,rgba(6,78,59,.98),rgba(7,35,38,.98))",border:"1px solid rgba(74,222,128,.35)",boxShadow:"0 10px 35px rgba(0,0,0,.18)"};
const freeLabel={display:"inline-block",padding:"5px 9px",borderRadius:999,background:"rgba(34,197,94,.14)",color:"#4ade80",fontSize:10,fontWeight:950,letterSpacing:1.5};
const freeButton={border:0,cursor:"pointer",padding:"14px 20px",borderRadius:12,background:"#22c55e",color:"#04130a",fontWeight:950,fontSize:14,whiteSpace:"nowrap" as const};
const roomCard={display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:14,borderRadius:16,background:"rgba(7,18,39,.9)",border:"1px solid rgba(96,165,250,.16)"};
const freeBadge={padding:"5px 8px",borderRadius:999,background:"rgba(34,197,94,.12)",color:"#4ade80",fontSize:9,fontWeight:950,letterSpacing:1};
const paidBadge={padding:"5px 8px",borderRadius:999,background:"rgba(245,158,11,.12)",color:"#fbbf24",fontSize:9,fontWeight:950,letterSpacing:1};
const joinBtn={border:0,cursor:"pointer",background:"#22c55e",color:"#04130a",padding:"10px 14px",borderRadius:10,fontWeight:950,fontSize:12};
const empty={padding:28,textAlign:"center" as const,borderRadius:18,border:"1px dashed #334155",color:"#94a3b8",lineHeight:1.8};