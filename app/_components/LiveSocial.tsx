"use client";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import ChatVoice from "./ChatVoice";

type Member={id:string;playerId?:string;name:string;host?:boolean;ready?:boolean;board?:string;dice?:string;connected?:boolean};
type Msg={id:string;name:string;text:string;at:number;type?:string};
const QUICK=["👋 Hi!","😂 LOL","🔥 Nice!","😮 Wow!","👏 Good move","🎉 GG","❤️","😎"];

export default function LiveSocial({roomCode,name,host=false,roomSize=4,compact=false,onStart,onKicked,leaveRequested=false,onLeaveComplete}:{roomCode:string;name:string;host?:boolean;roomSize?:number;compact?:boolean;onStart?:()=>void;onKicked?:()=>void;leaveRequested?:boolean;onLeaveComplete?:()=>void}){
 const socketRef=useRef<Socket|null>(null),startRef=useRef(onStart),kickRef=useRef(onKicked),leaveRef=useRef(onLeaveComplete),startTimerRef=useRef<number|null>(null);
 startRef.current=onStart;kickRef.current=onKicked;leaveRef.current=onLeaveComplete;
 const[members,setMembers]=useState<Member[]>([]),[messages,setMessages]=useState<Msg[]>([]),[text,setText]=useState(""),[notice,setNotice]=useState(""),[selfId,setSelfId]=useState(""),[selfPlayerId,setSelfPlayerId]=useState("");
 useEffect(()=>{let cancelled=false;const connect=async()=>{
   let playerId="",board="classic",dice="classic";
   try{const a=await fetch("/api/auth",{cache:"no-store"}).then(r=>r.json());playerId=String(a.user?.id||"");board=a.user?.equippedBoard||"classic";dice=a.user?.equippedDice||"classic"}catch{}
   setSelfPlayerId(playerId);
   try{const c=await fetch("/api/customization",{cache:"no-store"}).then(r=>r.json());board=c.equippedBoard||board;dice=c.equippedDice||dice}catch{}
   if(cancelled)return;
   const socket=io(window.location.origin,{transports:["websocket","polling"],reconnection:true});socketRef.current=socket;
   socket.on("connect",()=>{setSelfId(socket.id||"");socket.emit("join-room",{roomCode,name,roomSize,playerId,board,dice,host})});
   socket.on("roster",(list:Member[])=>{setMembers(list);const me=list.find(m=>m.id===socket.id||m.playerId===playerId);if(me)setSelfPlayerId(me.playerId||playerId);});
   socket.on("game-state",(state:any)=>{const roster=Array.isArray(state?.players)?state.players:[];if(!roster.length)return;setMembers(prev=>{const byPlayer=new Map(prev.map(m=>[m.playerId||m.id,m]));return roster.map((p:any)=>{const old=byPlayer.get(String(p.playerId));return{...(old||{id:String(p.playerId)}),id:old?.id||String(p.playerId),playerId:String(p.playerId),name:String(p.name||old?.name||"Player"),host:Number(p.seat)===0,ready:!!p.ready,connected:!!p.connected}})});});
   socket.on("chat",(m:Msg)=>setMessages(x=>[...x,m].slice(-80)));
   socket.on("start-game",(payload:any)=>{try{localStorage.setItem("ludo-match-board",payload?.board||"classic");localStorage.setItem("ludo-match-members",JSON.stringify(payload?.members||[]))}catch{}if(startTimerRef.current!==null){window.clearTimeout(startTimerRef.current);startTimerRef.current=null}setNotice("Game starting…");startRef.current?.()});
   socket.on("room-error",(m:string)=>{if(startTimerRef.current!==null){window.clearTimeout(startTimerRef.current);startTimerRef.current=null}setNotice(m||"Unable to update the room.")});
   socket.on("start-error",(m:string)=>setNotice(m||"Unable to start the game."));
   socket.on("kicked",()=>{setNotice("You were removed by the room host.");kickRef.current?.()});
   return()=>{cancelled=true;if(startTimerRef.current!==null)window.clearTimeout(startTimerRef.current);socket.disconnect();socketRef.current=null};
 };connect();return()=>{cancelled=true}},[roomCode,name,host,roomSize]);
 useEffect(()=>{if(!leaveRequested)return;const socket=socketRef.current;if(!socket)return;setNotice("Leaving room…");socket.disconnect();socketRef.current=null;const timer=window.setTimeout(()=>leaveRef.current?.(),150);return()=>window.clearTimeout(timer)},[leaveRequested]);
 const self=members.find(m=>m.id===selfId||m.playerId===selfPlayerId),ready=!!self?.ready;
 const serverHost=!!members.find(m=>(m.host&&m.playerId===selfPlayerId)||(m.host&&m.id===selfId));
 const canStart=host&&serverHost&&members.length===roomSize&&members.every(m=>m.ready&&m.connected!==false);
 const send=(value=text)=>{const v=value.trim();if(!v)return;socketRef.current?.emit("chat",{text:v});setText("")};
 const toggleReady=()=>{if(!socketRef.current?.connected){setNotice("Reconnecting to the room…");return}socketRef.current.emit("ready",{ready:!ready})};
 const kick=(id:string)=>socketRef.current?.emit("kick-player",id);
 const announceStart=()=>{if(!socketRef.current||!canStart)return;setNotice("Starting game…");socketRef.current.emit("start-game");if(startTimerRef.current!==null)window.clearTimeout(startTimerRef.current);startTimerRef.current=window.setTimeout(()=>{startTimerRef.current=null;setNotice("Opening game…");startRef.current?.()},700)};
 const voiceMembers=members.filter(m=>m.playerId).map(m=>({id:String(m.playerId),name:m.name,role:m.host?"owner":"member",online:m.connected!==false}));
 return <section className={`live-social${compact?" live-social-compact":""}`}><div className="live-social-grid"><div className="live-social-panel"><div className="live-social-head"><b>Players</b><span className="live-social-muted">{members.length}/{roomSize}</span></div>{serverHost&&<div style={{padding:"9px 12px",marginBottom:8,borderRadius:10,background:"rgba(37,99,235,.12)",color:"#bfdbfe",fontSize:12}}>🎨 Host board: <b>{members.find(m=>m.host)?.board||"classic"}</b> · 🎲 {members.find(m=>m.host)?.dice||"classic"} dice</div>}<div className="live-social-list">{members.map(m=><div key={m.id} className="live-social-member"><span>{m.host?"👑 ":""}{m.name}{(m.id===selfId||m.playerId===selfPlayerId)?" (you)":""}</span><span className="live-social-member-actions"><span className={`live-social-ready ${m.ready?"is-ready":""}`}>{m.ready?"Ready":"Not ready"}</span>{host&&serverHost&&!m.host&&<button onClick={()=>kick(m.id)} className="live-social-kick">Kick</button>}</span></div>)}</div><div className="live-social-actions"><button type="button" onClick={toggleReady} className="live-social-action">{ready?"Unready":"Ready"}</button><ChatVoice roomCode={roomCode} playerId={selfPlayerId} members={voiceMembers}/>{host&&<button type="button" disabled={!canStart} onClick={announceStart} className="live-social-action live-social-start" style={{opacity:canStart?1:.4}}>Start Game</button>}</div>{notice&&<small className="live-social-notice">{notice}</small>}</div><div className="live-social-panel live-social-chat"><div className="live-social-head"><b>💬 Chat</b><span className="live-social-room">Room {roomCode}</span></div><div className="live-social-messages">{messages.length===0?<small className="live-social-empty">Say hello to the room.</small>:messages.map((m,i)=><div key={m.at+"-"+i} className="live-social-message"><b>{m.name}:</b> <span>{m.text}</span></div>)}</div><div className="live-social-quick">{QUICK.map(q=><button key={q} onClick={()=>send(q)} className="live-social-quick-btn">{q}</button>)}</div><div className="live-social-composer"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder="Type a message…" className="live-social-input"/><button onClick={()=>send()} className="live-social-send">Send</button></div></div></div></section>
}
