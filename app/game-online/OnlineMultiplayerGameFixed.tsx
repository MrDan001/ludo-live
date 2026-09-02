"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import CanonicalLudoBoard, { type BoardThemeId, type DemoToken } from "../_components/CanonicalLudoBoard";
import DemoDice from "../_components/DemoDice";
import ChatVoice from "../_components/ChatVoice";
import { canMove, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats, tokenState } from "../../lib/ludoRules";

type Color = "red"|"yellow"|"green"|"blue";
type Player = { playerId:string; name:string; seat:number; colors?:Color[]; level?:number; avatar?:string; coins?:number; peerId?:string };
type TokenMap = Record<string,Record<string,{position:number}>>;
type GameState = { status:string; currentPlayerId:string|null; dice:DiceValue|null; pendingMove:DiceValue|null; players:Player[]; tokens:TokenMap; winnerId?:string|null; stateRevision?:number };
type MoveEvent = { playerId?:string; tokenId:string; from:number; to:number; finalTo?:number; captureProgress?:number|null; captured?:{playerId:string;color:Color;id:number}|null; captureToCenter?:boolean; stateRevision?:number };

const COLORS:Color[]=["red","yellow","green","blue"];
const normalize=(serverTokens:TokenMap):DemoToken[]=>{
  const pos:Partial<Record<`${Color}:${number}`,number>>={};
  Object.values(serverTokens||{}).forEach(group=>Object.entries(group||{}).forEach(([key,t])=>{if(/^(red|yellow|green|blue):[0-3]$/.test(key)){const p=Number(t?.position);if(Number.isFinite(p))pos[key as `${Color}:${number}`]=p;}}));
  return COLORS.flatMap(color=>Array.from({length:4},(_,id)=>{const position=pos[`${color}:${id}`]??0;return {color,id,position,state:tokenState(position)};}));
};

export default function OnlineMultiplayerGameFixed(){
  const params=useSearchParams();
  const [theme]=useState<BoardThemeId>("classic");
  const [socket,setSocket]=useState<Socket|null>(null);
  const [me,setMe]=useState(""); const [myName,setMyName]=useState(""); const [myAvatar,setMyAvatar]=useState("");
  const [game,setGame]=useState<GameState|null>(null); const [roster,setRoster]=useState<Player[]>([]);
  const [tokens,setTokens]=useState<DemoToken[]>(()=>normalize({})); const [roll,setRoll]=useState<DiceValue>(6); const [pending,setPending]=useState<DiceValue|null>(null);
  const [remoteRolling,setRemoteRolling]=useState(false); const [animating,setAnimating]=useState(false); const [roomCode,setRoomCode]=useState("W100NB");
  const [chatOpen,setChatOpen]=useState(false); const [playersOpen,setPlayersOpen]=useState(false); const [chatUnread,setChatUnread]=useState(false); const [chatText,setChatText]=useState("");
  const [chatMessages,setChatMessages]=useState<Array<{id:string;name:string;text:string;at:number}>>([]); const [soundEnabled,setSoundEnabled]=useState(true);
  const revisionRef=useRef(-1); const authoritativeRef=useRef<DemoToken[]>(tokens); const animatingRef=useRef(false); const queueRef=useRef<MoveEvent[]>([]); const timerRef=useRef<number[]>([]); const mountedRef=useRef(true); const chatOpenRef=useRef(false); const requestPendingRef=useRef(false); const skipPendingRef=useRef(false);
  const clearTimers=useCallback(()=>{timerRef.current.forEach(window.clearTimeout);timerRef.current=[];},[]);
  const sleep=useCallback((ms:number)=>new Promise<void>(resolve=>{timerRef.current.push(window.setTimeout(resolve,ms));}),[]);

  const animateMove=useCallback(async(move:MoveEvent)=>{
    if(!mountedRef.current)return;
    animatingRef.current=true;setAnimating(true);requestPendingRef.current=false;skipPendingRef.current=false;
    const [color,idText]=String(move.tokenId).split(":"); const id=Number(idText); if(!COLORS.includes(color as Color)||!Number.isInteger(id))return;
    const from=Number(move.from); const capture=Boolean(move.captureToCenter&&move.captured); const contact=Number(capture?(move.captureProgress??move.to):move.to); const finalTo=Number(move.finalTo??(capture?FINISH_PROGRESS:move.to));
    const update=(position:number)=>setTokens(prev=>prev.map(t=>t.color===color&&t.id===id?{...t,position,state:tokenState(position)}:t));
    update(from);
    if(contact!==from){const step=contact>from?1:-1;for(let p=from+step;;p+=step){await sleep(280);if(!mountedRef.current)return;update(p);if(p===contact)break;}}
    if(capture&&move.captured){setTokens(prev=>prev.map(t=>t.color===move.captured!.color&&t.id===move.captured!.id?{...t,position:0,state:"yard"}:t));await sleep(220);if(!mountedRef.current)return;}
    if(finalTo!==contact){await sleep(capture?0:220);if(!mountedRef.current)return;update(finalTo);}
    else if(capture)update(FINISH_PROGRESS);
    const next=queueRef.current.shift();
    if(next){await animateMove(next);return;}
    animatingRef.current=false;setAnimating(false);setTokens(authoritativeRef.current.map(t=>({...t})));
  },[sleep]);

  const enqueueMove=useCallback((move:MoveEvent)=>{queueRef.current.push(move);if(!animatingRef.current){const next=queueRef.current.shift();if(next)void animateMove(next);}},[animateMove]);

  useEffect(()=>{chatOpenRef.current=chatOpen;},[chatOpen]);
  useEffect(()=>()=>{mountedRef.current=false;clearTimers();},[clearTimers]);
  useEffect(()=>{const r=params.get("room");if(r)setRoomCode(r);},[params]);
  useEffect(()=>{try{const s=JSON.parse(localStorage.getItem("ludo-settings")||"{}");if(s.sound!==undefined)setSoundEnabled(s.sound!==false);}catch{}},[]);

  const players=useMemo(()=>{const byId=new Map((game?.players||[]).map(p=>[String(p.playerId),p]));return roster.length?roster.map(m=>({...byId.get(String(m.playerId)),...m} as Player)):(game?.players||[]);},[game?.players,roster]);
  const mine=players.find(p=>String(p.playerId)===String(me))||players[0]; const opponent=players.find(p=>String(p.playerId)!==String(me));
  const myColors=useMemo<Color[]>(()=>mine?.colors?.length?mine.colors:(playerColorsForSeats(players.length===2?2:4,mine?.seat??0) as Color[]),[mine,players.length]);
  const myTurn=game?String(game.currentPlayerId||"")===String(me):false;
  const legalTokenKeys=useMemo(()=>pending===null||!myTurn?[]:tokens.filter(t=>myColors.includes(t.color)&&canMove(tokens,t,pending)).map(t=>`${t.color}-${t.id}`),[pending,myTurn,tokens,myColors]);

  useEffect(()=>{
    let mounted=true;let s:Socket|null=null;
    const connect=async()=>{
      let playerId="",name="",avatar="",level=1,coins=0;
      try{const[a,c]=await Promise.all([fetch("/api/auth",{cache:"no-store"}),fetch("/api/customization",{cache:"no-store"})]);const d=await a.json();const custom=c.ok?await c.json():null;playerId=String(d?.user?.id||"");name=String(d?.user?.username||"");avatar=String(d?.user?.avatar||d?.user?.image||"");level=Math.max(1,Number(d?.user?.level)||1);coins=Math.max(0,Number(d?.user?.coins)||0);const eq=String(custom?.equippedAvatar||"");const found=Array.isArray(custom?.avatars)?custom.avatars.find((x:{id?:string})=>x.id===eq):null;if(found?.imageUrl||found?.icon)avatar=String(found.imageUrl||found.icon);}catch{}
      if(!mounted)return;setMe(playerId);setMyName(name);setMyAvatar(avatar);
      const room=params.get("room")||roomCode;const roomSize=Number(params.get("size")||2);s=io(window.location.origin,{transports:["websocket","polling"],reconnection:true});setSocket(s);
      s.on("connect",()=>{if(room&&playerId)s?.emit("join-room",{roomCode:room,name,avatar,level,coins,roomSize,playerId});});
      s.on("roster",(members:Player[])=>{const list=Array.isArray(members)?members:[];setRoster(list);setGame(g=>g?{...g,players:list}:{status:"waiting",currentPlayerId:null,dice:null,pendingMove:null,players:list,tokens:{}});});
      s.on("game-dice",(e:{value:DiceValue})=>{setRoll(e.value);setRemoteRolling(true);timerRef.current.push(window.setTimeout(()=>setRemoteRolling(false),900));});
      s.on("chat",(m:{id?:string;name?:string;text?:string;at?:number;playerId?:string})=>{if(!mounted||!m?.text)return;const id=String(m.id||""),n=String(m.name||"Player"),text=String(m.text),at=Number(m.at||Date.now());setChatMessages(items=>id&&items.some(x=>x.id===id)?items:[...items.slice(-99),{id:id||`remote-${at}`,name:n,text,at}]);if(!chatOpenRef.current&&String(m.playerId||"")!==playerId&&n!==name)setChatUnread(true);});
      s.on("game-state",(next:GameState)=>{if(!mounted)return;const r=Number(next.stateRevision??-1);if(r>=0&&revisionRef.current>=0&&r<revisionRef.current)return;if(r>=0)revisionRef.current=r;setGame(next);if(next.dice!==null)setRoll(next.dice);setPending(String(next.currentPlayerId||"")===playerId?next.pendingMove:null);authoritativeRef.current=normalize(next.tokens||{});if(skipPendingRef.current){skipPendingRef.current=false;animatingRef.current=false;setAnimating(false);}else if(!animatingRef.current&&queueRef.current.length===0)setTokens(authoritativeRef.current.map(t=>({...t})));});
      s.on("game-moved",(move:MoveEvent)=>{if(!mounted||!move?.tokenId)return;if(Number.isFinite(Number(move.stateRevision)))revisionRef.current=Math.max(revisionRef.current,Number(move.stateRevision));enqueueMove(move);setPending(null);});
      s.on("game-move-error",()=>{requestPendingRef.current=false;skipPendingRef.current=false;animatingRef.current=false;setAnimating(false);});
    };
    void connect();return()=>{mounted=false;s?.disconnect();};
  },[params,roomCode,enqueueMove]);

  useEffect(()=>{if(!socket||!game||!myTurn||pending===null||animating||requestPendingRef.current||skipPendingRef.current)return;if(!tokens.some(t=>myColors.includes(t.color)&&canMove(tokens,t,pending))){skipPendingRef.current=true;setAnimating(true);socket.emit("game-move",{tokenId:"__skip__"});}},[socket,game,myTurn,pending,animating,tokens,myColors]);
  const chooseToken=useCallback((color:Color,id:number)=>{if(!socket||!game||!myTurn||pending===null||animating||requestPendingRef.current)return;const token=tokens.find(t=>t.color===color&&t.id===id);if(!token||!myColors.includes(color)||!canMove(tokens,token,pending))return;requestPendingRef.current=true;setAnimating(true);socket.emit("game-move",{tokenId:`${color}:${id}`});},[socket,game,myTurn,pending,animating,tokens,myColors]);
  const handleRoll=useCallback(()=>{if(!socket||!game||!myTurn||pending!==null||animating||remoteRolling||requestPendingRef.current)return;socket.emit("game-roll");},[socket,game,myTurn,pending,animating,remoteRolling]);
  const sendChat=()=>{const text=chatText.trim();if(!text||!socket?.connected)return;const now=Date.now();setChatMessages(x=>[...x.slice(-99),{id:`local-${now}`,name:mine?.name||myName||"Player",text,at:now}]);socket.emit("chat",{text});setChatText("");};
  const members=players.map(p=>({id:p.playerId,playerId:p.playerId,name:p.name,online:true,peerId:p.peerId}));
  return <main className="mp-page"><div className="mp-shell"><header className="mp-top"><div className="mp-player"><div className="mp-avatar">{mine?.avatar?<img src={mine.avatar} alt="Avatar"/>:"👤"}</div><div><b>{mine?.name||myName||"Player"}</b><small>{myTurn?"YOUR TURN":"WAITING"}</small></div></div><div className="mp-logo">♛<b>LUDO</b><small>LIVE</small></div><div className="mp-player"><div><b>{opponent?.name||"Waiting"}</b><small>{opponent?"IN MATCH":"WAITING"}</small></div><div className="mp-avatar">{opponent?.avatar?<img src={opponent.avatar} alt="Avatar"/>:"👤"}</div></div></header><section className="mp-board"><CanonicalLudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys}/></section><section className="mp-controls"><div className="mp-dice"><div><b>{myTurn?"YOUR TURN":"OPPONENT'S TURN"}</b><span>{myTurn?"Roll and make your move":"Wait for the other player"}</span></div><DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn||pending!==null||animating||remoteRolling}/></div><div className="mp-actions"><button type="button" onClick={()=>{setChatOpen(v=>!v);setChatUnread(false)}}>💬{chatUnread?"•":""}</button><div><ChatVoice socket={socket} roomCode={roomCode} playerId={me} members={members as any}/></div></div></section><div className="mp-reactions">{["👋 Hi!","😂 LOL","🔥 Nice!","👍 Good move","🏆 GG","😜"].map(x=><button key={x} type="button" onClick={()=>{setChatOpen(true);setChatText(x)}}>{x}</button>)}</div><footer className="mp-footer"><button type="button" onClick={()=>{if(window.confirm("Are you sure you want to leave this match?")){socket?.emit("leave-room");window.location.href="/lobby";}}}>↪ Leave</button><button type="button" onClick={()=>setPlayersOpen(v=>!v)}>👥 Players</button><button type="button" onClick={()=>{const n=!soundEnabled;setSoundEnabled(n);try{const s=JSON.parse(localStorage.getItem("ludo-settings")||"{}");localStorage.setItem("ludo-settings",JSON.stringify({...s,sound:n}));}catch{}}}>{soundEnabled?"🔊":"🔇"} Sound</button><span>🛡️ Room: {roomCode}</span></footer>{chatOpen&&<section className="mp-overlay"><div><b>Room Chat</b><button type="button" onClick={()=>setChatOpen(false)}>×</button></div><article>{chatMessages.length?chatMessages.map(m=><p key={`${m.id}-${m.at}`}><b>{m.name}</b><span>{m.text}</span></p>):<em>No messages yet.</em>}</article><form onSubmit={e=>{e.preventDefault();sendChat()}}><input value={chatText} onChange={e=>setChatText(e.target.value)} placeholder="Type a message…"/><button>Send</button></form></section>}{playersOpen&&<section className="mp-overlay"><div><b>Players in Room</b><button type="button" onClick={()=>setPlayersOpen(false)}>×</button></div>{players.map(p=><p className="mp-row" key={p.playerId}><span>👤</span><b>{p.name}</b><small>★ {p.level||1} · {String(p.playerId)===String(me)?"You":"In match"}</small></p>)}</section>}</div><style jsx global>{`.mp-page{position:fixed;inset:0;background:#000;color:#fff;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.mp-shell{height:100dvh;display:grid;grid-template-rows:74px minmax(0,1fr) auto;gap:8px;padding:8px}.mp-top{display:grid;grid-template-columns:1fr 82px 1fr;gap:7px;align-items:center}.mp-player{height:60px;border:1px solid #5f4818;border-radius:18px;background:linear-gradient(145deg,#181208,#070706);display:flex;align-items:center;gap:7px;padding:7px;min-width:0}.mp-player>div:nth-child(2){min-width:0}.mp-player b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mp-player small{display:block;margin-top:3px;font-size:7px;color:#49e983;font-weight:900}.mp-avatar{width:44px;height:44px;flex:0 0 44px;border-radius:50%;border:2px solid #d5ae3b;background:#111;display:grid;place-items:center;overflow:hidden}.mp-avatar img{width:100%;height:100%;object-fit:cover}.mp-logo{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#e7bd45;font-family:Georgia,serif;font-size:20px}.mp-logo b{font-size:20px;line-height:.9}.mp-logo small{font:900 10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:1px}.mp-board{min-width:0;min-height:0;display:grid;place-items:center;overflow:hidden}.mp-board>*{width:min(100%,calc(100dvh - 255px));max-width:680px}.mp-controls{display:grid;grid-template-columns:minmax(0,1fr) 52px;gap:6px;min-width:0}.mp-dice{height:106px;border:1px solid #4b3a1d;border-radius:15px;background:linear-gradient(145deg,#17120b,#070705);display:flex;align-items:center;justify-content:space-between;padding:10px}.mp-dice b{display:block;font-size:9px;color:#4be982}.mp-dice span{display:block;color:#888;font-size:8px;margin-top:4px}.mp-actions{display:flex;flex-direction:column;gap:5px}.mp-actions>button,.mp-actions>div{height:50px;border:1px solid #4b3a1d;border-radius:13px;background:#100d08;color:#fff}.mp-actions>button{font-size:19px}.mp-reactions{display:flex;gap:4px;overflow:auto}.mp-reactions button,.mp-footer button,.mp-footer span{border:1px solid #3e3019;border-radius:12px;background:#100d08;color:#d8c98e;padding:7px 9px;font-size:8px;white-space:nowrap}.mp-footer{display:flex;gap:5px;min-width:0}.mp-footer>*{min-width:0}.mp-footer span{overflow:hidden;text-overflow:ellipsis;flex:1;text-align:center}.mp-overlay{position:absolute;z-index:200;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92%,420px);max-height:70%;display:flex;flex-direction:column;padding:12px;border:1px solid #8f6b22;border-radius:17px;background:#0d0a06;box-shadow:0 20px 70px #000;color:#fff}.mp-overlay>div{display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid #3d2c12}.mp-overlay>div button{border:0;background:none;color:#e9c653;font-size:22px}.mp-overlay article{flex:1;overflow:auto;padding:8px 0}.mp-overlay p{margin:5px 0;padding:7px 9px;border-radius:10px;background:#1b140b}.mp-overlay p b,.mp-overlay p span{display:block}.mp-overlay p b{font-size:9px;color:#dfba50}.mp-overlay p span{font-size:12px}.mp-overlay em{display:block;text-align:center;color:#888;padding:30px 0}.mp-overlay form{display:flex;gap:5px;border-top:1px solid #3d2c12;padding-top:8px}.mp-overlay input{flex:1;min-width:0;background:#080706;border:1px solid #5f4818;border-radius:9px;color:#fff;padding:8px}.mp-overlay form button{border:1px solid #b48a28;border-radius:9px;background:#c79621;color:#120d05;font-weight:900;padding:0 12px}.mp-row{display:grid!important;grid-template-columns:32px 1fr;gap:5px;align-items:center}.mp-row small{grid-column:2;color:#75e99c;font-size:8px}.mp-row span{grid-row:1 / span 2;font-size:18px}@media(min-width:701px){.mp-shell{padding:12px 20px 16px;grid-template-rows:86px minmax(0,1fr) auto}.mp-top{grid-template-columns:1fr 110px 1fr}.mp-player{height:72px}.mp-avatar{width:54px;height:54px;flex-basis:54px}.mp-logo{font-size:24px}.mp-logo b{font-size:28px}.mp-logo small{font-size:12px}.mp-board>*{width:min(100%,calc(100dvh - 310px));max-width:720px}.mp-controls{grid-template-columns:minmax(0,1fr) 72px}.mp-dice{height:130px}.mp-actions>button,.mp-actions>div{height:62px}.mp-reactions button,.mp-footer button,.mp-footer span{font-size:9px;padding:8px 11px}}`}</style></main>;
}
