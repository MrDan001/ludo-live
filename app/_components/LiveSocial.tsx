"use client";

import { useEffect, useMemo, useRef, useState } from "react";

declare global { interface Window { LudoLiveSocial?: any } }
type Member={id:string;name:string;host?:boolean;ready?:boolean;roomSize?:number};
type Msg={id:string;name:string;text:string;at:number;type?:string};
const QUICK=["👋 Hi!","😂 LOL","🔥 Nice!","😮 Wow!","👏 Good move","🎉 GG","❤️","😎"];

export default function LiveSocial({roomCode,name,host=false,roomSize=4,compact=false,onStart}:{roomCode:string;name:string;host?:boolean;roomSize?:number;compact?:boolean;onStart?:()=>void}){
 const social=useRef<any>(null); const startRef=useRef(onStart); startRef.current=onStart;
 const [members,setMembers]=useState<Member[]>([]); const [messages,setMessages]=useState<Msg[]>([]); const [text,setText]=useState(""); const [mic,setMic]=useState(false); const [notice,setNotice]=useState("");
 useEffect(()=>{let cancelled=false;const boot=async()=>{const done=()=>{if(cancelled||!window.LudoLiveSocial)return;const s=new window.LudoLiveSocial({roomCode,name,host,roomSize,onState:setMembers,onMessage:(m:Msg)=>{if(m.type==="start"){startRef.current?.();return}setMessages(x=>[...x,m].slice(-80))}});social.current=s;s.start()};if(window.LudoLiveSocial)done();else{const el=document.createElement("script");el.src="/live-social.js";el.async=true;el.onload=done;document.body.appendChild(el)}};boot();return()=>{cancelled=true;social.current?.stop();social.current=null}},[roomCode,name,host,roomSize]);
 const self=useMemo(()=>members.find(m=>m.id===social.current?.selfId),[members]); const ready=!!self?.ready;
 const send=()=>{const v=text.trim();if(!v)return;social.current?.sendChat(v);setText("")};
 const toggleMic=async()=>{const ok=await social.current?.toggleMic();setMic(!!ok);if(!ok)setNotice("Microphone permission was not granted.");else setNotice("")};
 const toggleReady=()=>social.current?.setReady(!ready); const canStart=host&&members.length===roomSize&&members.every(m=>m.ready);
 return <section style={{marginTop:20,display:"grid",gap:12}}>
  <div style={{display:"grid",gridTemplateColumns:compact?"1fr":"1fr 1fr",gap:12}}>
   <div style={{padding:16,borderRadius:18,background:"rgba(2,6,23,.88)",border:"1px solid rgba(148,163,184,.14)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><b>Players</b><span style={{color:"#94a3b8",fontSize:12}}>{members.length}/{roomSize}</span></div><div style={{display:"grid",gap:8}}>{members.map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"9px 10px",borderRadius:11,background:"rgba(15,23,42,.7)"}}><span>{m.host?"👑 ":""}{m.name}{m.id===social.current?.selfId?" (you)":""}</span><span style={{fontSize:12,color:m.ready?"#4ade80":"#fbbf24"}}>{m.ready?"Ready":"Not ready"}</span></div>)}</div><div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}><button onClick={toggleReady} style={actionBtn}>{ready?"Unready":"Ready"}</button><button onClick={toggleMic} style={{...actionBtn,background:mic?"#16a34a":"#334155"}}>{mic?"🎙️ Mic On":"🎙️ Mic Off"}</button>{host&&<button disabled={!canStart} onClick={()=>social.current?.announceStart()} style={{...actionBtn,background:"#22c55e",opacity:canStart?1:.4}}>Start Game</button>}</div>{notice&&<small style={{color:"#fbbf24",display:"block",marginTop:8}}>{notice}</small>}</div>
   <div style={{padding:16,borderRadius:18,background:"rgba(2,6,23,.88)",border:"1px solid rgba(148,163,184,.14)",display:"grid",gridTemplateRows:"auto 1fr auto auto",minHeight:compact?260:360}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><b>💬 Chat</b><span style={{fontSize:11,color:"#64748b"}}>Room {roomCode}</span></div><div style={{overflowY:"auto",display:"grid",alignContent:"start",gap:7,padding:"10px 0",maxHeight:180}}>{messages.length===0?<small style={{color:"#64748b"}}>Say hello to the room.</small>:messages.map((m,i)=><div key={m.at+"-"+i} style={{fontSize:13}}><b>{m.name}:</b> <span>{m.text}</span></div>)}</div><div style={{display:"flex",gap:6,flexWrap:"wrap",paddingBottom:8}}>{QUICK.map(q=><button key={q} onClick={()=>social.current?.sendChat(q)} style={quickBtn}>{q}</button>)}</div><div style={{display:"flex",gap:7}}><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Type a message…" style={input}/><button onClick={send} style={sendBtn}>Send</button></div></div>
  </div>
 </section>;
}
const actionBtn={border:0,borderRadius:10,padding:"10px 12px",background:"#2563eb",color:"#fff",fontWeight:800,cursor:"pointer"};
const quickBtn={border:"1px solid #334155",borderRadius:999,padding:"6px 9px",background:"#0f172a",color:"#e2e8f0",cursor:"pointer",fontSize:12};
const input={flex:1,minWidth:0,border:"1px solid #334155",borderRadius:10,padding:"10px 12px",background:"#0f172a",color:"#fff"};
const sendBtn={border:0,borderRadius:10,padding:"10px 12px",background:"#16a34a",color:"#fff",fontWeight:800};
