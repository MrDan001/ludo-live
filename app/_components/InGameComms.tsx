"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import ChatVoice from "../_components/ChatVoice";
import AvatarRenderer from "../_components/AvatarRenderer";
import { AVATAR_ICONS } from "../_components/EquippedAvatar";

type Member={id:string;playerId?:string;name:string;host?:boolean;ready?:boolean;connected?:boolean;avatar?:string};
type Msg={id:string;name:string;text:string;at:number;type?:string};
type AvatarProfile={equipped?:{avatar?:string}};

const quick=["👋 Hi!","😂 LOL","🔥 Nice!","👏 Good move","🎉 GG","😎"];

function avatar(id?:string,imageUrl?:string|null,size=38){
 const key=String(id||"default");
 return <AvatarRenderer avatar={{id:key,icon:AVATAR_ICONS[key]||"🧑🏽‍🎮",imageUrl:imageUrl||null}} size={size} border="2px solid #d7b94a" background="#251a06" fallback={AVATAR_ICONS[key]||"🧑🏽‍🎮"}/>;
}

export default function InGameComms({roomCode,playerId}:{roomCode:string;playerId:string}){
 const socketRef=useRef<Socket|null>(null);
 const [members,setMembers]=useState<Member[]>([]);
 const [messages,setMessages]=useState<Msg[]>([]);
 const [profiles,setProfiles]=useState<Record<string,AvatarProfile>>({});
 const [avatarImages,setAvatarImages]=useState<Record<string,string>>({});
 const [chatOpen,setChatOpen]=useState(false);
 const [playersOpen,setPlayersOpen]=useState(false);
 const [text,setText]=useState("");
 const [speaker,setSpeaker]=useState(true);
 const [unread,setUnread]=useState(0);
 const chatOpenRef=useRef(false);

 useEffect(()=>{
  let dead=false;
  const socket=io(window.location.origin,{transports:["websocket","polling"],reconnection:true});
  socketRef.current=socket;
  const roster=(list:Member[])=>{if(!dead)setMembers(list)};
  const chat=(m:Msg)=>{if(dead)return;setMessages(x=>[...x,m].slice(-80));setUnread(n=>chatOpenRef.current?0:n+1)};
  socket.on("roster",roster);
  socket.on("chat",chat);
  return()=>{dead=true;socket.off("roster",roster);socket.off("chat",chat);socketRef.current=null};
 },[]);

 const refreshProfiles=async()=>{
  const names=[...new Set(members.map(m=>m.name).filter(Boolean))];
  const rows=await Promise.all(names.map(async name=>{try{const r=await fetch(`/api/player/${encodeURIComponent(name)}`,{cache:"no-store"});if(!r.ok)return null;const d=await r.json();return [name,{equipped:d.player?.equipped||{}}] as const}catch{return null}}));
  const next={...profiles};
  for(const row of rows){if(row)next[row[0]]=row[1]}
  setProfiles(next);
 };

 useEffect(()=>{if(members.length)void refreshProfiles();},[members.length]);
 useEffect(()=>{const timer=window.setInterval(()=>{if(members.length)void refreshProfiles()},5000);return()=>window.clearInterval(timer)},[members.length]);
 useEffect(()=>{let dead=false;fetch("/api/shop/catalog",{cache:"no-store"}).then(r=>r.json()).then(c=>{const map:Record<string,string>={};for(const item of Array.isArray(c?.items)?c.items:[])if(item?.type==="avatar"&&item?.id&&item?.imageUrl)map[String(item.id)]=String(item.imageUrl);if(!dead)setAvatarImages(map)}).catch(()=>{});return()=>{dead=true}},[]);
 useEffect(()=>{document.querySelectorAll<HTMLAudioElement>('audio[id^="chat-remote-"]').forEach(a=>{a.muted=!speaker});},[speaker]);

 const visibleMembers=members.slice(0,4);
 const send=(value=text)=>{const v=value.trim();if(!v)return;socketRef.current?.emit("chat",{text:v});setText("");};
 const voiceMembers=useMemo(()=>members.filter(m=>m.playerId).map(m=>({id:String(m.playerId),name:m.name,role:m.host?"owner":"member",online:m.connected!==false})),[members]);
 const closeChat=()=>{chatOpenRef.current=false;setChatOpen(false);setUnread(0)};
 const openChat=()=>{chatOpenRef.current=true;setChatOpen(true);setUnread(0)};

 return <>
  <div className="ig-top-players" aria-label="Players">
   {visibleMembers.map((m,i)=>{const id=profiles[m.name]?.equipped?.avatar||m.avatar||"default";return <button key={m.id} type="button" className={`ig-avatar ${m.playerId===playerId?"me":""}`} onClick={()=>setPlayersOpen(true)} aria-label={m.name}>{avatar(id,avatarImages[id],34)}<span className="ig-seat">{i+1}</span>{m.connected!==false&&<i/>}</button>})}
  </div>
  <div className="ig-actions" aria-label="In-game communication">
   <div className="ig-mic-slot"><ChatVoice roomCode={roomCode} playerId={playerId} members={voiceMembers}/></div>
   <button type="button" className={`ig-action ${unread?"notify":""}`} onClick={openChat}><span>💬</span><small>Chat</small>{unread>0&&<b>{Math.min(unread,9)}</b>}</button>
   <button type="button" className="ig-action" onClick={()=>setPlayersOpen(true)}><span>👥</span><small>Players</small></button>
   <button type="button" className={`ig-action ${speaker?"on":""}`} onClick={()=>setSpeaker(v=>!v)}><span>{speaker?"🔊":"🔇"}</span><small>{speaker?"Sound":"Mute"}</small></button>
  </div>

  {chatOpen&&<div className="ig-sheet-backdrop" onClick={closeChat}><section className="ig-chat-sheet" onClick={e=>e.stopPropagation()}>
   <header><div><strong>💬 In-game Chat</strong><small>All players can see messages</small></div><button onClick={closeChat}>✕</button></header>
   <div className="ig-messages">{messages.length===0?<span className="ig-empty">No messages yet.</span>:messages.map((m,i)=>{const id=profiles[m.name]?.equipped?.avatar||"default";return <div className="ig-message" key={`${m.id}-${i}`}>{avatar(id,avatarImages[id],32)}<div><b>{m.name}</b><p>{m.text}</p></div></div>})}</div>
   <div className="ig-quick">{quick.map(q=><button key={q} onClick={()=>send(q)}>{q}</button>)}</div>
   <div className="ig-composer"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Type a message…"/><button onClick={()=>send()}>➤</button></div>
  </section></div>}

  {playersOpen&&<div className="ig-sheet-backdrop" onClick={()=>setPlayersOpen(false)}><section className="ig-players-sheet" onClick={e=>e.stopPropagation()}><header><strong>👥 Players</strong><button onClick={()=>setPlayersOpen(false)}>✕</button></header>{visibleMembers.map((m)=>{const id=profiles[m.name]?.equipped?.avatar||m.avatar||"default";return <div className="ig-player-row" key={m.id}>{avatar(id,avatarImages[id],42)}<div><b>{m.name}{m.playerId===playerId?" (You)":""}</b><small>{m.connected===false?"Disconnected":"Online"}</small></div><span>{m.host?"👑":""}</span></div>})}</section></div>}

  <style jsx global>{`
   .ig-top-players{position:fixed;z-index:40;top:10px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:8px;padding:6px 10px;border:1px solid rgba(215,185,74,.42);border-radius:999px;background:rgba(19,12,3,.82);box-shadow:0 8px 24px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,244,190,.12);backdrop-filter:blur(14px);pointer-events:auto}
   .ig-avatar{position:relative;width:46px;height:46px;padding:4px;border:1px solid rgba(215,185,74,.42);border-radius:50%;background:linear-gradient(145deg,#3a2708,#120c02);display:grid;place-items:center;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 4px 14px rgba(0,0,0,.28)}
   .ig-avatar.me{border-color:#f3d36b;box-shadow:0 0 0 2px rgba(243,211,107,.16),0 0 18px rgba(215,185,74,.22)}
   .ig-avatar i{position:absolute;right:0;bottom:1px;width:9px;height:9px;border-radius:50%;background:#45e27d;border:2px solid #160e03}.ig-seat{position:absolute;left:-3px;top:-3px;min-width:16px;height:16px;padding:0 3px;border-radius:999px;background:#d7b94a;color:#170d00;font:900 9px/16px system-ui;text-align:center}
   .ig-actions{position:fixed;z-index:40;left:50%;bottom:14px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(215,185,74,.5);border-radius:22px;background:linear-gradient(145deg,rgba(31,20,6,.96),rgba(9,7,4,.94));box-shadow:0 14px 34px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,244,190,.12);backdrop-filter:blur(16px);max-width:calc(100vw - 18px)}
   .ig-action,.ig-mic-slot{width:58px;height:56px;border-radius:16px;border:1px solid rgba(215,185,74,.26);background:linear-gradient(145deg,#2a1b07,#100b03);color:#f9e7a6;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
   .ig-action{cursor:pointer}.ig-action span{font-size:21px;line-height:20px}.ig-action small{margin-top:4px;font-size:8px;font-weight:900;letter-spacing:.6px;color:#d9c47b}.ig-action.on{border-color:rgba(87,230,126,.65);box-shadow:0 0 18px rgba(87,230,126,.13),inset 0 1px 0 rgba(255,255,255,.08)}.ig-action.notify{border-color:#e2b93f;box-shadow:0 0 18px rgba(226,185,63,.2)}.ig-action b{position:absolute;right:-3px;top:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#c8322e;color:#fff;font:900 10px/18px system-ui}
   .ig-mic-slot{padding:0;overflow:hidden}.ig-mic-slot>div{width:100%;height:100%;display:flex;align-items:center;justify-content:center}.ig-mic-slot button{width:100%!important;height:100%!important;border:0!important;border-radius:16px!important;padding:0!important;background:linear-gradient(145deg,#2a1b07,#100b03)!important;color:#f9e7a6!important;font:900 8px system-ui!important;box-shadow:none!important}.ig-mic-slot button:first-letter{font-size:18px}.ig-mic-slot button{line-height:12px}
   .ig-sheet-backdrop{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.62);display:flex;align-items:flex-end;justify-content:center;padding:10px;backdrop-filter:blur(4px)}
   .ig-chat-sheet,.ig-players-sheet{width:min(520px,100%);max-height:78dvh;border:1px solid rgba(215,185,74,.62);border-radius:24px 24px 16px 16px;background:linear-gradient(155deg,#1d1305,#090704 70%);box-shadow:0 -18px 55px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,244,190,.12);padding:14px;display:flex;flex-direction:column;color:#fff}
   .ig-chat-sheet header,.ig-players-sheet header{display:flex;align-items:center;justify-content:space-between;padding:3px 2px 10px}.ig-chat-sheet header div{display:flex;flex-direction:column}.ig-chat-sheet header strong,.ig-players-sheet header strong{font-size:16px;color:#f7df8b}.ig-chat-sheet header small{margin-top:3px;color:#9e8d62;font-size:9px}.ig-chat-sheet header button,.ig-players-sheet header button{width:34px;height:34px;border-radius:50%;border:1px solid rgba(215,185,74,.35);background:#160e03;color:#f9e7a6;font-size:16px;cursor:pointer}
   .ig-messages{overflow:auto;min-height:130px;max-height:45dvh;padding:4px 2px}.ig-empty{display:block;color:#887b5c;text-align:center;padding:40px 0}.ig-message{display:flex;gap:9px;align-items:flex-start;padding:7px 2px}.ig-message>div{min-width:0}.ig-message b{font-size:11px;color:#f0d36f}.ig-message p{margin:3px 0 0;padding:8px 10px;border-radius:12px 12px 12px 3px;background:#171108;border:1px solid rgba(215,185,74,.13);color:#eee2c2;font-size:12px;max-width:300px;overflow-wrap:anywhere}
   .ig-quick{display:flex;gap:5px;overflow:auto;padding:7px 0}.ig-quick button{white-space:nowrap;border:1px solid rgba(215,185,74,.2);background:#171006;color:#dfcf9b;border-radius:999px;padding:7px 9px;font-size:10px;cursor:pointer}.ig-composer{display:flex;gap:7px}.ig-composer input{min-width:0;flex:1;border:1px solid rgba(215,185,74,.35);background:#0d0903;color:#fff;border-radius:13px;padding:11px 12px;outline:none}.ig-composer input:focus{border-color:#d7b94a}.ig-composer button{width:46px;border:0;border-radius:13px;background:linear-gradient(145deg,#e7c85d,#a47b18);color:#160d00;font-size:19px;font-weight:1000;cursor:pointer}
   .ig-players-sheet{max-height:60dvh}.ig-player-row{display:flex;align-items:center;gap:10px;padding:10px 4px;border-top:1px solid rgba(215,185,74,.12)}.ig-player-row>div{display:flex;flex-direction:column;flex:1}.ig-player-row b{font-size:13px;color:#f4df9b}.ig-player-row small{margin-top:2px;color:#8f815f;font-size:9px}.ig-player-row>span{color:#f1cf58}
   @media(max-width:420px){.ig-top-players{top:7px;gap:5px;padding:5px 7px}.ig-avatar{width:41px;height:41px}.ig-actions{bottom:8px;gap:5px;padding:7px}.ig-action,.ig-mic-slot{width:53px;height:52px;border-radius:15px}.ig-action span{font-size:19px}.ig-action small{font-size:7px}.ig-chat-sheet,.ig-players-sheet{border-radius:22px 22px 14px 14px;padding:12px}.ig-messages{max-height:42dvh}}
  `}</style>
 </>;
}
