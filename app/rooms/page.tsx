"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
type Room={code:string;players:number;roomSize:number;hostName:string;board?:string};

export default function Rooms(){
 const [rooms,setRooms]=useState<Room[]>([]);
 const [name,setName]=useState("PlayerOne");
 const [connected,setConnected]=useState(false);
 const [refreshing,setRefreshing]=useState(false);
 const socketRef=useRef<Socket|null>(null);

 useEffect(()=>{
  const n=localStorage.getItem("ludo-player-name");
  if(n)setName(n);
 },[]);

 const refreshRooms=useCallback(()=>{
  const socket=socketRef.current;
  if(!socket)return;
  setRefreshing(true);
  if(socket.connected)socket.emit("list-rooms");
  window.setTimeout(()=>setRefreshing(false),700);
 },[]);

 useEffect(()=>{
  let cancelled=false;
  let reconnectTimer:number|undefined;
  const socket=io(window.location.origin,{transports:["websocket","polling"],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:500,reconnectionDelayMax:5000});
  socketRef.current=socket;

  const requestRooms=()=>{
   if(cancelled)return;
   setConnected(true);
   socket.emit("list-rooms");
  };
  const onRooms=(list:Room[])=>{
   if(cancelled)return;
   setRooms(Array.isArray(list)?list:[]);
   setRefreshing(false);
  };
  const onDisconnect=()=>{
   if(cancelled)return;
   setConnected(false);
   window.clearTimeout(reconnectTimer);
   reconnectTimer=window.setTimeout(()=>socket.connect(),1500);
  };

  socket.on("connect",requestRooms);
  socket.on("room-list",onRooms);
  socket.on("disconnect",onDisconnect);
  socket.on("connect_error",()=>setConnected(false));

  // Keep the public room browser fresh even if another player creates or leaves
  // a room between socket broadcasts or after a mobile connection wakes up.
  const interval=window.setInterval(()=>{
   if(socket.connected)socket.emit("list-rooms");
  },3000);

  if(socket.connected)requestRooms();
  return()=>{
   cancelled=true;
   window.clearInterval(interval);
   window.clearTimeout(reconnectTimer);
   socket.off("connect",requestRooms);
   socket.off("room-list",onRooms);
   socket.off("disconnect",onDisconnect);
   socket.disconnect();
   socketRef.current=null;
  };
 },[]);

 const join=(r:Room)=>{
  localStorage.setItem("ludo-player-name",name);
  window.location.href=`/room?action=join&code=${r.code}&size=${r.roomSize}`;
 };

 return <main className="subpage">
  <header className="sub-head"><a href="/">‹</a><div><small>LIVE NOW</small><h1>Online Players</h1></div><span>{connected?"🟢":"🟠"}</span></header>
  <div className="online-count" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
   <span>{rooms.length} open room{rooms.length===1?"":"s"} · {connected?"rooms update live":"reconnecting…"}</span>
   <button onClick={refreshRooms} disabled={!connected||refreshing} style={{border:"1px solid rgba(96,165,250,.35)",background:"rgba(15,23,42,.7)",color:"#bfdbfe",borderRadius:10,padding:"7px 11px",fontWeight:800,cursor:connected?"pointer":"not-allowed",opacity:connected?1:.55}}>{refreshing?"Refreshing…":"↻ Refresh"}</button>
  </div>
  <section className="room-browser">
   {rooms.map(r=><article className="browser-room" key={r.code}>
    <div className="room-avatar">{(r.hostName||"H")[0]}</div>
    <div className="room-info"><b>{r.hostName}'s room</b><span>Room {r.code} · {r.players}/{r.roomSize} players</span></div>
    <button onClick={()=>join(r)}>JOIN</button>
   </article>)}
   {!rooms.length&&<div className="empty-big"><div>🎲</div><h2>{connected?"No one is waiting yet":"Connecting to live rooms…"}</h2><p>{connected?"Create a game and your room will appear here automatically for players worldwide while it has an open seat.":"We’re reconnecting to the live room service. Your room list will return automatically."}</p>{connected&&<a href="/room">CREATE ROOM</a>}</div>}
  </section>
 </main>
}