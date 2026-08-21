"use client";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

declare global { interface Window { LudoLiveSocial?: any } }
type Member={id:string;name:string;host?:boolean;ready?:boolean;roomSize?:number};
type Msg={id:string;name:string;text:string;at:number;type?:string};
const QUICK=["👋 Hi!","😂 LOL","🔥 Nice!","😮 Wow!","👏 Good move","🎉 GG","❤️","😎"];

export default function LiveSocial({roomCode,name,host=false,roomSize=4,compact=false,onStart,onKicked}:{roomCode:string;name:string;host?:boolean;roomSize?:number;compact?:boolean;onStart?:()=>void;onKicked?:()=>void}){
 const socketRef=useRef<Socket|null>(null);const voiceRef=useRef<any>(null);const startRef=useRef(onStart);const kickRef=useRef(onKicked);startRef.current=onStart;kickRef.current=onKicked;
 const [members,setMembers]=useState<Member[]>([]);const [messages,setMessages]=useState<Msg[]>([]);const [text,setText]=useState("");const [mic,setMic]=useState(false);const [notice,setNotice]=useState("");const [selfId,setSelfId]=useState("");
 useEffect(()=>{let cancelled=false;const socket=io(window.location.origin,{transports:["websocket","polling"]});socketRef.current=socket;socket.on("connect",()=>{if(cancelled)return;setSelfId(socket.id||"");socket.emit("join-room",{roomCode,name,roomSize})});socket.on("roster",(list:Member[])=>setMembers(list));socket.on("chat",(m:Msg)=>setMessages(x=>[...x,m].slice(-80)));socket.on("start-game",()=>startRef.current?.());socket.on("room-error",(m:string)=>setNotice(m));socket.on("kicked",()=>{setNotice("You were removed by the room host.");kickRef.current?.()});
 const bootVoice=()=>{if(cancelled||!window.LudoLiveSocial)return;const v=new window.LudoLiveSocial({roomCode,name,host,roomSize,onState:()=>{},onMessage:()=>{}});voiceRef.current=v;v.start()};
 if(window.LudoLiveSocial)bootVoice();else{const el=document.createElement("script");el.src="/live-social.js?m=3";el.async=true;el.onload=bootVoice;document.body.appendChild(el)}
 return()=>{cancelled=true;socket.disconnect();socketRef.current=null;voiceRef.current?.stop();voiceRef.current=null}},[roomCode,name,host,roomSize]);
 const self=members.find(m=>m.id===selfId);const ready=!!self?.ready;const canStart=host&&members.length===roomSize&&members.every(m=>m.ready);
 const send=(value=text)=>{const v=value.trim();if(!v)return;socketRef.current?.emit("chat",{text:v});setText("")};
 const toggleMic=async()=>{const ok=await voiceRef.current?.toggleMic();setMic(!!ok);setNotice(ok?"":"Microphone permission was not granted.")};
 const toggleReady=()=>socketRef.current?.emit("ready",{ready:!ready});
 const kick=(id:string)=>socketRef.current?.emit("kick-player",id);
 const announceStart=()=>socketRef.current?.emit("start-game");
 return <section className={`live-social${compact?" live-social-compact":""}`}><div className="live-social-grid">
  <div className="live-social-panel"><div className="live-social-head"><b>Players</b><span className="live-social-muted">{members.length}/{roomSize}</span></div><div className="live-social-list">{members.map(m=><div key={m.id} className="live-social-member"><span>{m.host?"👑 ":""}{m.name}{m.id===selfId?" (you)":""}</span><span className="live-social-member-actions"><span className={`live-social-ready ${m.ready?"is-ready":""}`}>{m.ready?"Ready":"Not ready"}</span>{host&&!m.host&&<button onClick={()=>kick(m.id)} className="live-social-kick">Kick</button>}</span></div>)}</div><div className="live-social-actions"><button onClick={toggleReady} className="live-social-action">{ready?"Unready":"Ready"}</button><button onClick={toggleMic} className="live-social-action" style={{background:mic?"#16a34a":"#334155"}}>{mic?"🎙️ Mic On":"🎙️ Mic Off"}</button>{host&&<button disabled={!canStart} onClick={announceStart} className="live-social-action live-social-start" style={{opacity:canStart?1:.4}}>Start Game</button>}</div>{notice&&<small className="live-social-notice">{notice}</small>}</div>
  <div className="live-social-panel live-social-chat"><div className="live-social-head"><b>💬 Chat</b><span className="live-social-room">Room {roomCode}</span></div><div className="live-social-messages">{messages.length===0?<small className="live-social-empty">Say hello to the room.</small>:messages.map((m,i)=><div key={m.at+"-"+i} className="live-social-message"><b>{m.name}:</b> <span>{m.text}</span></div>)}</div><div className="live-social-quick">{QUICK.map(q=><button key={q} onClick={()=>send(q)} className="live-social-quick-btn">{q}</button>)}</div><div className="live-social-composer"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Type a message…" className="live-social-input"/><button onClick={()=>send()} className="live-social-send">Send</button></div></div>
 </div></section>;
}
