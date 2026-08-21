"use client";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

type Profile={id:string;name:string;level:number;rank:string;badges:string[];streak:number};
type Member=Profile&{role:"owner"|"admin"|"member";online:boolean};
type Msg={id?:string;fromId?:string;name:string;text:string;at:number};
type Room={code:string;title:string;members:Member[];messages:Msg[]};
type CR={code:string;title:string;hostName:string;members:number;maxMembers:number;locked:boolean;ownerId:string};

const pid=()=>{let x=localStorage.getItem("ludo-player-id");if(!x){x=crypto.randomUUID();localStorage.setItem("ludo-player-id",x)}return x};
const pname=()=>localStorage.getItem("ludo-player-name")||"PlayerOne";
const meProfile=():Profile=>({id:pid(),name:pname().slice(0,24),level:Number(localStorage.getItem("ludo-level")||25),rank:localStorage.getItem("ludo-rank")||"Gold",badges:["🏆 Champion"],streak:Number(localStorage.getItem("ludo-streak")||0)});

const mini={border:0,borderRadius:8,padding:"7px 9px",background:"#2563eb",color:"#fff",fontWeight:800,fontSize:11};
const panel={position:"absolute" as const,left:12,right:12,bottom:76,zIndex:20,maxHeight:380,overflowY:"auto" as const,padding:14,borderRadius:16,background:"#071936",border:"1px solid #315b9f",boxShadow:"0 16px 40px rgba(0,0,0,.45)"};
const row={display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:10,borderBottom:"1px solid rgba(255,255,255,.06)"};
const nameBtn={border:0,background:"transparent",color:"#fff",fontWeight:850,textAlign:"left" as const};
const close={border:0,background:"transparent",color:"#fff",fontSize:26};
const toast={position:"fixed" as const,top:18,left:"50%",transform:"translateX(-50%)",zIndex:100,padding:"13px 18px",borderRadius:14,background:"#0b7a46",color:"#fff",fontWeight:800,boxShadow:"0 12px 35px rgba(0,0,0,.4)",maxWidth:"90%",textAlign:"center" as const};
const requestBox={margin:"12px 0 18px",padding:12,borderRadius:14,background:"#102a52",border:"1px solid #315b9f"};
const friendCard={width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 14px",margin:"8px 0",borderRadius:14,border:"1px solid #1d3b68",background:"#0b2041",color:"#fff",textAlign:"left" as const};
const dmShell={marginTop:18,borderRadius:18,overflow:"hidden",background:"#071936",border:"1px solid #315b9f"};
const dmHead={padding:16,background:"#0e2c59",display:"flex",justifyContent:"space-between"};
const dmHistory={minHeight:280,maxHeight:430,overflowY:"auto" as const,padding:14};
const myBubble={margin:"8px 0 8px auto",maxWidth:"82%",padding:12,borderRadius:"14px 14px 4px 14px",background:"#1558cf",color:"#fff"};
const theirBubble={margin:"8px auto 8px 0",maxWidth:"82%",padding:12,borderRadius:"14px 14px 14px 4px",background:"#102a52",color:"#fff"};

export default function Chat(){
 const [playerId]=useState(()=>typeof window!=="undefined"?pid():"");
 const [name,setName]=useState("PlayerOne");
 const [socket,setSocket]=useState<Socket|null>(null);
 const [rooms,setRooms]=useState<CR[]>([]);
 const [myRoom,setMyRoom]=useState<Room|null>(null);
 const [room,setRoom]=useState<Room|null>(null);
 const [members,setMembers]=useState<Member[]>([]);
 const [messages,setMessages]=useState<Msg[]>([]);
 const [error,setError]=useState("");
 const [title,setTitle]=useState("");
 const [createOpen,setCreateOpen]=useState(false);
 const [tab,setTab]=useState<"all"|"mine"|"friends">("all");
 const [memberOpen,setMemberOpen]=useState(false);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [friends,setFriends]=useState<Profile[]>([]);
 const [requests,setRequests]=useState<Profile[]>([]);
 const [selected,setSelected]=useState<Profile|null>(null);
 const [privateMsgs,setPrivateMsgs]=useState<Record<string,Msg[]>>({});
 const [text,setText]=useState("");
 const [privateText,setPrivateText]=useState("");
 const [notice,setNotice]=useState("");

 const notify=(message:string)=>{setNotice(message);window.setTimeout(()=>setNotice(v=>v===message?"":v),3000)};

 useEffect(()=>{
  const s=io(window.location.origin,{transports:["websocket","polling"]});
  const sync=()=>{const p=meProfile();setName(p.name);s.emit("set-chat-profile",p)};
  s.on("chat-room-list",setRooms);
  s.on("chat-my-room",setMyRoom);
  s.on("chat-room-joined",(d:any)=>{const r:Room={code:d.code,title:d.title,members:d.members||[],messages:d.messages||[]};setRoom(r);setMyRoom(r);setMembers(r.members);setMessages(r.messages);setError("")});
  s.on("chat-room-members",(m:Member[])=>{setMembers(m);setRoom(r=>r?{...r,members:m}:r);setMyRoom(r=>r?{...r,members:m}:r)});
  s.on("chat-room-message",(m:Msg)=>setMessages(v=>[...v,m]));
  s.on("chat-room-error",(m:string)=>setError(String(m)));
  s.on("chat-kicked",(m:any)=>{notify(m.reason||"You were removed from the room");setRoom(null);setMembers([]);s.emit("list-chat-rooms",{playerId})});
  s.on("friends-state",(d:any)=>{setFriends(d.friends||[]);setRequests(d.requests||[])});
  s.on("friend-request-received",(p:Profile)=>{notify(`Friend request received from ${p.name}`);s.emit("list-friends",{playerId})});
  s.on("friend-request-sent",(p:Profile)=>notify(`Friend request sent to ${p.name}`));
  s.on("friend-request-accepted",(p:Profile)=>{notify(`${p.name} accepted your friend request`);s.emit("list-friends",{playerId})});
  s.on("friend-message",(m:Msg)=>{const id=m.fromId||"";setPrivateMsgs(v=>({...v,[id]:[...(v[id]||[]),m]}))});
  s.on("private-history",(d:{friendId:string;messages:Msg[]})=>setPrivateMsgs(v=>({...v,[d.friendId]:d.messages||[]})));
  s.emit("list-chat-rooms",{playerId});s.emit("list-friends",{playerId});sync();
  window.addEventListener("ludo-profile-updated",sync);setSocket(s);
  return()=>{window.removeEventListener("ludo-profile-updated",sync);s.disconnect()};
 },[playerId]);

 const create=()=>{socket?.emit("create-chat-room",{title:title||`${name}'s Chat`,playerId});setTitle("");setCreateOpen(false)};
 const join=(code:string)=>socket?.emit("join-chat-room",{roomCode:code,playerId});
 const send=()=>{if(text.trim()&&socket&&room){socket.emit("chat-room-message",{text:text.trim()});setText("")}};
 const addFriend=(id:string)=>socket?.emit("send-friend-request",{targetId:id});
 const accept=(id:string)=>socket?.emit("accept-friend-request",{fromId:id});
 const kick=(id:string)=>socket?.emit("kick-chat-member",id);
 const promote=(id:string)=>socket?.emit("set-chat-admin",id);
 const demote=(id:string)=>socket?.emit("remove-chat-admin",id);
 const openFriend=(f:Profile)=>{setSelected(f);setProfile(null);socket?.emit("get-private-history",{friendId:f.id})};
 const sendPrivate=()=>{if(privateText.trim()&&selected&&socket){socket.emit("private-message",{targetId:selected.id,text:privateText.trim()});setPrivateText("")}};
 const ordered=(list:Member[])=>[...list].sort((a,b)=>{const rank:Record<string,number>={owner:0,admin:1,member:2};return rank[a.role]-rank[b.role]});

 if(room){
  const me=members.find(x=>x.id===playerId);
  return <main className="subpage">
   <header className="sub-head"><button onClick={()=>{setRoom(null);setMembers([])}}>‹</button><div><small>{me?.role?.toUpperCase()}</small><h1>{room.title}</h1></div><span>👥 {members.length}/20</span></header>
   <section className="chat-room-live" style={{position:"relative"}}>
    <div className="chat-history">{messages.map((m,i)=><div className="bubble" key={m.id||i}><b>{m.name}</b><p>{m.text}</p><small>{new Date(m.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></div>)}</div>
    {memberOpen&&<div style={panel}><h3 style={{margin:"0 0 8px"}}>Room members</h3>{ordered(members).map(m=><div key={m.id} style={row}><button onClick={()=>m.id!==playerId&&setProfile(m)} style={nameBtn}>{m.name} {m.role==="owner"?"👑":m.role==="admin"?"🛡️":""}</button><div>{m.id!==playerId&&<button style={mini} onClick={()=>addFriend(m.id)}>＋ Friend</button>}{me?.role==="owner"&&m.id!==playerId&&<><button style={mini} onClick={()=>m.role==="admin"?demote(m.id):promote(m.id)}>{m.role==="admin"?"Demote":"Admin"}</button><button style={mini} onClick={()=>kick(m.id)}>Kick</button></>}{me?.role==="admin"&&m.id!==playerId&&m.role==="member"&&<button style={mini} onClick={()=>kick(m.id)}>Kick</button>}</div></div>)}</div>}
    {profile&&<div style={{...panel,top:12,bottom:"auto"}}><button onClick={()=>setProfile(null)} style={close}>×</button><h2>{profile.name}</h2><p>Rank: <b>{profile.rank}</b></p><p>Level: <b>{profile.level}</b></p><p>🏅 {profile.badges.join(" · ")}</p><p>🔥 Streak: <b>{profile.streak}</b></p><button className="big-primary" onClick={()=>{addFriend(profile.id);setProfile(null)}}>＋ ADD FRIEND</button></div>}
    <div className="chat-compose"><button style={mini} onClick={()=>setMemberOpen(v=>!v)}>👥</button><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={`Chat as ${name}…`}/><button onClick={()=>setText(v=>v+" ❤️")}>❤️</button><button onClick={send}>➤</button></div>
   </section>
  </main>;
 }

 return <main className="subpage">
  {notice&&<div style={toast}>{notice}</div>}
  <header className="sub-head"><button onClick={()=>history.back()}>‹</button><div><small>WORLD CHAT</small><h1>Chat Rooms</h1></div><span>💬</span></header>
  <div style={{display:"flex",gap:8,margin:"12px 0",flexWrap:"wrap"}}><button className={tab==="all"?"big-primary":""} onClick={()=>setTab("all")}>ALL ROOMS</button><button className={tab==="mine"?"big-primary":""} onClick={()=>setTab("mine")}>MY ROOM</button><button className={tab==="friends"?"big-primary":""} onClick={()=>setTab("friends")}>FRIENDS {requests.length?`(${requests.length})`:""}</button></div>
  {error&&<div className="empty-big">{error}</div>}

  {tab==="friends"&&<section className="room-browser chat-browser">
   <h2>Friends</h2>
   {requests.length>0&&<div style={requestBox}><b>Friend requests</b>{requests.map(r=><div key={r.id} style={row}><button style={nameBtn} onClick={()=>setProfile(r)}>{r.name} · Lv {r.level}</button><button style={mini} onClick={()=>accept(r.id)}>ACCEPT</button></div>)}</div>}
   {friends.length===0&&!requests.length&&<div className="empty-big"><h2>No friends yet</h2><p>Accept a friend request or add players from a room.</p></div>}
   {friends.length>0&&<div>{friends.map(f=><button key={f.id} onClick={()=>openFriend(f)} style={friendCard}><div><b>{f.name}</b><span>Lv {f.level} · {f.rank}</span></div><span>›</span></button>)}</div>}
   {selected&&<div style={dmShell}><div style={dmHead}><div><b>{selected.name}</b><div>Lv {selected.level} · {selected.rank}</div></div><button onClick={()=>setSelected(null)} style={close}>×</button></div><div style={dmHistory}>{(privateMsgs[selected.id]||[]).length===0?<p style={{opacity:.6,textAlign:"center"}}>No messages yet. Say hello.</p>:(privateMsgs[selected.id]||[]).map((m,i)=><div key={m.id||i} style={m.fromId===playerId?myBubble:theirBubble}><b>{m.name}</b><div>{m.text}</div><small>{new Date(m.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></div>)}</div><div className="chat-compose"><input value={privateText} onChange={e=>setPrivateText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendPrivate()} placeholder={`Message ${selected.name}…`}/><button onClick={sendPrivate}>➤</button></div></div>}
   {profile&&<div style={{...panel,top:12,bottom:"auto"}}><button onClick={()=>setProfile(null)} style={close}>×</button><h2>{profile.name}</h2><p>Rank: <b>{profile.rank}</b></p><p>Level: <b>{profile.level}</b></p><p>🏅 {profile.badges.join(" · ")}</p><p>🔥 Streak: <b>{profile.streak}</b></p></div>}
  </section>}

  {tab==="mine"&&<section className="room-browser chat-browser">{myRoom?<article className="browser-room"><div className="room-avatar">👑</div><div className="room-info"><b>{myRoom.title}</b><span>Owner: {myRoom.members.find(m=>m.role==="owner")?.name||name} · {myRoom.members.length}/20 · {myRoom.code}</span></div><button onClick={()=>join(myRoom.code)}>OPEN MY ROOM</button></article>:<div className="empty-big"><h2>You don't have a room</h2><button className="big-primary" onClick={()=>setCreateOpen(true)}>＋ CREATE CHAT ROOM</button></div>}</section>}

  {tab==="all"&&<><p className="sub-intro">All live rooms created by you and other players. You can belong to only one room at a time.</p><button className="big-primary" onClick={()=>setCreateOpen(true)}>＋ CREATE CHAT ROOM</button><section className="room-browser chat-browser">{rooms.map(r=>{const member=myRoom?.code===r.code;return <article className="browser-room" key={r.code}><div className="room-avatar">{member?"👑":"💬"}</div><div className="room-info"><b>{r.title}</b><span>{r.hostName} · {r.members}/20 · {r.code}</span></div><button disabled={r.members>=20&&!member} onClick={()=>join(r.code)}>{member?"ENTER":"JOIN"}</button></article>})}{!rooms.length&&<div className="empty-big"><h2>No chat rooms yet</h2></div>}</section></>}

  {createOpen&&<div className="modal-backdrop"><div className="modal"><button className="modal-x" onClick={()=>setCreateOpen(false)}>×</button><h2>Create Chat Room</h2><p>Owner: <b>{name}</b></p><label>Room name<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={40} placeholder={`${name}'s Chat`}/></label><button className="modal-primary" onClick={create}>CREATE ROOM</button></div></div>}
 </main>;
}
