"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import CanonicalLudoBoard, { type BoardThemeId, type DemoToken } from "../_components/CanonicalLudoBoard";
import DemoDice from "../_components/DemoDice";
import ChatVoice from "../_components/ChatVoice";
import LudoConfirmModal from "../_components/LudoConfirmModal";
import { canMove, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats, tokenState } from "../../lib/ludoRules";
import type { DiceSkinId } from "../_components/LudoDice";

type Color = "red" | "yellow" | "green" | "blue";
type Player = { playerId:string; name:string; seat?:number; colors?:Color[]; level?:number; avatar?:string; coins?:number; peerId?:string; host?:boolean; ready?:boolean; connected?:boolean; board?:string; dice?:string; yard?:string };
type TokenMap = Record<string, Record<string, {position:number}>>;
type GameState = { status:string; currentPlayerId:string|null; dice:DiceValue|null; pendingMove:DiceValue|null; players:Player[]; tokens:TokenMap; winnerId?:string|null; stateRevision?:number };
type MoveEvent = { playerId?:string; tokenId:string; from:number; to?:number; target?:number; finalTo?:number; captureProgress?:number|null; captured?:{playerId:string;color:Color;id:number}|null; captureToCenter?:boolean; stateRevision?:number };
type ChatMessage = { id:string; playerId?:string; name:string; text:string; at:number };
type Cosmetics = { board:BoardThemeId; dice:DiceSkinId; yard:string };
type CustomizationResponse = { equippedBoard?:string; equippedDice?:string; equippedItems?:unknown[] };

const COLORS:Color[]=["red","yellow","green","blue"];
const REACTIONS=["👋 Hi!","😂 LOL","🔥 Nice!","👍 Good move","🏆 GG","😜"];
const EMPTY_TOKENS:DemoToken[]=COLORS.flatMap(color=>Array.from({length:4},(_,id)=>({color,id,position:0,state:"yard" as const})));
const DEFAULT_COSMETICS:Cosmetics={board:"classic",dice:"classic",yard:""};

function normalizeTokens(serverTokens:TokenMap):DemoToken[]{
  return COLORS.flatMap(color=>Array.from({length:4},(_,id)=>{
    const value=serverTokens?.[color]?.[`${color}:${id}`]?.position ?? serverTokens?.[color]?.[String(id)]?.position ?? 0;
    const position=Number.isFinite(Number(value))?Number(value):0;
    return {color,id,position,state:tokenState(position)};
  }));
}

function uniquePlayers(items:Player[]){const seen=new Set<string>();return items.filter(item=>{const id=String(item?.playerId||"");if(!id||seen.has(id))return false;seen.add(id);return true;});}
function mergePlayers(gamePlayers:Player[], roster:Player[]){
  const map=new Map<string,Player>();
  for(const p of gamePlayers||[])map.set(String(p.playerId),{...p});
  for(const p of roster||[]){const id=String(p.playerId);const existing=map.get(id);map.set(id,existing?{...existing,...p,seat:existing.seat,colors:existing.colors}:{...p});}
  return uniquePlayers([...map.values()].sort((a,b)=>(Number(a.seat??999)-Number(b.seat??999))));
}

function PlayerAvatar({src}:{src?:string}){if(src&&(src.startsWith("http")||src.startsWith("/")||src.startsWith("data:")))return <img src={src} alt="Profile avatar" className="mp-avatar-image"/>;return <span>👤</span>;}

function ChatPanel({open,messages,me,value,setValue,onSend,onClose,onReaction}:{open:boolean;messages:ChatMessage[];me:string;value:string;setValue:(v:string)=>void;onSend:(v?:string)=>void;onClose:()=>void;onReaction:(v:string)=>void}){
  const listRef=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{if(!open)return;const el=listRef.current;if(!el)return;requestAnimationFrame(()=>{el.scrollTop=el.scrollHeight;});},[open,messages.length]);
  if(!open)return null;
  return <div className="mp-chat-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="mp-chat-panel" role="dialog" aria-modal="true" aria-label="Room Chat" onMouseDown={e=>e.stopPropagation()}>
      <div className="mp-chat-head"><strong>Room Chat</strong><button type="button" onClick={onClose} aria-label="Close chat">×</button></div>
      <div ref={listRef} className="mp-chat-list" style={{flex:"1 1 0",minHeight:0,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",touchAction:"pan-y",overscrollBehavior:"contain"}}>
        {messages.length===0?<div className="mp-chat-empty">No messages yet.</div>:messages.map(message=>{const mine=String(message.playerId||"")===String(me);return <div className={`mp-chat-message ${mine?"mine":""}`} key={message.id}><div className="mp-chat-name">{mine?"You":message.name}{mine?<span className="mp-chat-you">YOU</span>:null}</div><div className="mp-chat-text">{message.text}</div></div>;})}
      </div>
      <div className="mp-reactions">{REACTIONS.map(reaction=><button key={reaction} type="button" onClick={()=>onReaction(reaction)}>{reaction}</button>)}</div>
      <form className="mp-chat-compose" onSubmit={e=>{e.preventDefault();onSend();}}><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Type a message…" aria-label="Chat message" maxLength={240}/><button type="submit" disabled={!value.trim()}>Send</button></form>
    </section>
  </div>;
}

function StakeDisplay({roomCode}:{roomCode:string}){
  const [stake,setStake]=useState<{pot:number;status?:string}|null>(null);
  useEffect(()=>{let alive=true;const load=async()=>{try{const response=await fetch(`/api/multiplayer-stake?roomCode=${encodeURIComponent(roomCode)}`,{cache:"no-store"});if(!response.ok)return;const data=await response.json();const pot=Number(data?.pot)||0;if(alive)setStake(pot>0?{pot,status:String(data?.status||"")}:null);}catch{}};void load();const timer=window.setInterval(load,2500);return()=>{alive=false;window.clearInterval(timer);};},[roomCode]);
  if(!stake)return null;return <div className="mp-stake-bar">🪙 STAKED POT · {stake.pot.toLocaleString()} COINS · {String(stake.status||"").toUpperCase()}</div>;
}

export default function OnlineMultiplayerGame(){
  const params=useSearchParams();
  const roomCode=String(params.get("room")||"W100NB").trim().toUpperCase();
  const roomSize=Number(params.get("size")||2)===4?4:2;

  const [socket,setSocket]=useState<Socket|null>(null);
  const [connected,setConnected]=useState(false);
  const [connectionMessage,setConnectionMessage]=useState("Connecting…");
  const [me,setMe]=useState("");
  const [profile,setProfile]=useState({name:"Player",avatar:"",level:1,coins:0});
  const [game,setGame]=useState<GameState|null>(null);
  const [roster,setRoster]=useState<Player[]>([]);
  const [tokens,setTokens]=useState<DemoToken[]>(EMPTY_TOKENS);
  const [roll,setRoll]=useState<DiceValue>(6);
  const [remoteRolling,setRemoteRolling]=useState(false);
  const [actionBusy,setActionBusy]=useState(false);
  const [animating,setAnimating]=useState(false);
  const [cosmetics,setCosmetics]=useState<Cosmetics>(DEFAULT_COSMETICS);
  const [soundEnabled,setSoundEnabled]=useState(true);
  const [chatOpen,setChatOpen]=useState(false);
  const [chatUnread,setChatUnread]=useState(false);
  const [chatText,setChatText]=useState("");
  const [chatMessages,setChatMessages]=useState<ChatMessage[]>([]);
  const [playersOpen,setPlayersOpen]=useState(false);
  const [leaveConfirmOpen,setLeaveConfirmOpen]=useState(false);

  const authoritativeRef=useRef<DemoToken[]>(EMPTY_TOKENS);
  const animationRef=useRef(false);
  const moveQueueRef=useRef<MoveEvent[]>([]);
  const moveRequestRef=useRef(false);
  const rollRequestRef=useRef(false);
  const rollTimerRef=useRef<number|null>(null);
  const mountedRef=useRef(true);
  const chatOpenRef=useRef(false);
  const animateRef=useRef<(move:MoveEvent)=>Promise<void>>(async()=>{});
  const sendingChatRef=useRef(false);
  const hostCosmeticsRef=useRef<Cosmetics>(DEFAULT_COSMETICS);
  const isHostRef=useRef(false);

  const clearRollRequest=useCallback(()=>{if(rollTimerRef.current!==null)window.clearTimeout(rollTimerRef.current);rollTimerRef.current=null;rollRequestRef.current=false;setActionBusy(false);},[]);
  const recover=useCallback((s:Socket|null)=>{if(s?.connected)s.emit("game-recover",(result:{ok?:boolean})=>{if(result?.ok)setConnectionMessage("Connected");});},[]);

  const loadProfile=useCallback(async()=>{try{
    const [authResponse,customizationResponse]=await Promise.all([fetch("/api/auth",{cache:"no-store"}),fetch("/api/customization",{cache:"no-store"})]);
    const auth=await authResponse.json();const customization:CustomizationResponse=customizationResponse.ok?await customizationResponse.json():{};
    const name=String(auth?.user?.username||"Player");const avatar=String(auth?.user?.avatar||auth?.user?.image||"");const level=Math.max(1,Number(auth?.user?.level)||1);const coins=Math.max(0,Number(auth?.user?.coins)||0);
    const cosmetics:Cosmetics={board:String(customization.equippedBoard||"classic") as BoardThemeId,dice:String(customization.equippedDice||"classic") as DiceSkinId,yard:Array.isArray(customization.equippedItems)?String(customization.equippedItems.find(x=>typeof x==="string"&&x.startsWith("yard-"))||""):""};
    setProfile({name,avatar,level,coins});return{playerId:String(auth?.user?.id||""),name,avatar,level,coins,cosmetics};
  }catch{return null;}},[]);

  const loadChatHistory=useCallback(async()=>{try{const response=await fetch(`/api/multiplayer-chat?roomCode=${encodeURIComponent(roomCode)}`,{cache:"no-store"});if(!response.ok)return;const data=await response.json();const history:ChatMessage[]=Array.isArray(data?.messages)?data.messages.map((m:any)=>({id:String(m.id),playerId:String(m.playerId||""),name:String(m.name||"Player"),text:String(m.text||""),at:Number(m.at)||Date.now()})):[];setChatMessages(current=>{const merged=[...history,...current];const seen=new Set<string>();return merged.filter(message=>{if(seen.has(message.id))return false;seen.add(message.id);return true;}).sort((a,b)=>a.at-b.at).slice(-100);});}catch{}},[roomCode]);

  useEffect(()=>{mountedRef.current=true;try{const saved=JSON.parse(localStorage.getItem("ludo-settings")||"{}");if(saved.sound!==undefined)setSoundEnabled(saved.sound!==false);}catch{}return()=>{mountedRef.current=false;};},[]);
  useEffect(()=>{chatOpenRef.current=chatOpen;if(chatOpen)setChatUnread(false);},[chatOpen]);

  useEffect(()=>{
    let cancelled=false;let s:Socket|null=null;let cosmeticsTimer:number|null=null;
    const start=async()=>{
      const p=await loadProfile();if(cancelled||!p?.playerId)return;setMe(p.playerId);
      setCosmetics(p.cosmetics);hostCosmeticsRef.current=p.cosmetics;
      s=io(window.location.origin,{transports:["websocket"],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:250,reconnectionDelayMax:1500});setSocket(s);
      const join=()=>{if(cancelled)return;setConnected(true);setConnectionMessage("Connected");s?.emit("join-room",{roomCode,roomSize,name:p.name,avatar:p.avatar,level:p.level,coins:p.coins,board:p.cosmetics.board,dice:p.cosmetics.dice,yard:p.cosmetics.yard,playerId:p.playerId});void loadChatHistory();};
      s.on("connect",join);
      s.on("disconnect",()=>{setConnected(false);clearRollRequest();moveRequestRef.current=false;setConnectionMessage("Reconnecting…");});
      s.on("connect_error",error=>{setConnected(false);setConnectionMessage(`Connection error: ${error.message||"retrying"}`);});
      s.on("roster",(members:Player[])=>{const next=uniquePlayers(Array.isArray(members)?members:[]);setRoster(next);const host=next.find(m=>m.host);const mine=next.find(m=>String(m.playerId)===String(p.playerId));isHostRef.current=!!mine?.host;if(host){const c:Cosmetics={board:String(host.board||"classic") as BoardThemeId,dice:String(host.dice||"classic") as DiceSkinId,yard:String(host.yard||"")};hostCosmeticsRef.current=c;setCosmetics(c);}});
      s.on("host-cosmetics",(value:Cosmetics)=>{const c:Cosmetics={board:String(value?.board||"classic") as BoardThemeId,dice:String(value?.dice||"classic") as DiceSkinId,yard:String(value?.yard||"")};hostCosmeticsRef.current=c;setCosmetics(c);});
      s.on("game-state",(next:GameState)=>{if(!mountedRef.current)return;const authoritative=normalizeTokens(next.tokens||{});authoritativeRef.current=authoritative;setGame(next);setTokens(current=>animationRef.current?current:authoritative.map(t=>({...t})));const mineTurn=String(next.currentPlayerId||"")===String(p.playerId);if(!mineTurn||next.pendingMove===null)moveRequestRef.current=false;if(mineTurn&&next.pendingMove!==null)rollRequestRef.current=false;setPendingMoveRef(next.pendingMove,mineTurn);if(next.dice!==null)setRoll(next.dice);if(next.status!=="playing"){clearRollRequest();moveRequestRef.current=false;setAnimating(false);animationRef.current=false;}});
      s.on("game-dice",(event:{value:DiceValue;playerId?:string})=>{if(Number(event?.value)>=1)setRoll(event.value);setRemoteRolling(true);window.setTimeout(()=>mountedRef.current&&setRemoteRolling(false),900);if(String(event?.playerId||"")===String(p.playerId))clearRollRequest();});
      s.on("game-moved",(move:MoveEvent)=>{if(!move?.tokenId)return;moveRequestRef.current=false;setActionBusy(false);moveQueueRef.current.push(move);if(!animationRef.current){const next=moveQueueRef.current.shift();if(next)void animateRef.current(next);}});
      s.on("game-roll-error",()=>clearRollRequest());
      s.on("game-move-error",()=>{moveRequestRef.current=false;setActionBusy(false);recover(s);});
      s.on("chat",(message:any)=>{if(!message?.text)return;const normalized:ChatMessage={id:String(message.id||`${message.playerId||"player"}-${message.at||Date.now()}`),playerId:String(message.playerId||""),name:String(message.name||"Player"),text:String(message.text),at:Number(message.at)||Date.now()};setChatMessages(items=>items.some(item=>item.id===normalized.id)?items:[...items.slice(-99),normalized]);if(!chatOpenRef.current&&String(message.playerId)!==String(p.playerId))setChatUnread(true);});
      s.on("game-finished",(event:any)=>setConnectionMessage(String(event?.winnerId||"")===String(p.playerId)?"You won!":"Match finished"));
      const onOnline=()=>{if(s?.connected)recover(s);};window.addEventListener("online",onOnline);
      cosmeticsTimer=window.setInterval(async()=>{if(!mountedRef.current||!isHostRef.current)return;try{const response=await fetch("/api/customization",{cache:"no-store"});if(!response.ok)return;const data:CustomizationResponse=await response.json();const c:Cosmetics={board:String(data.equippedBoard||"classic") as BoardThemeId,dice:String(data.equippedDice||"classic") as DiceSkinId,yard:Array.isArray(data.equippedItems)?String(data.equippedItems.find(x=>typeof x==="string"&&x.startsWith("yard-"))||""):""};if(c.board!==hostCosmeticsRef.current.board||c.dice!==hostCosmeticsRef.current.dice||c.yard!==hostCosmeticsRef.current.yard){hostCosmeticsRef.current=c;setCosmetics(c);s?.emit("host-cosmetics-update",c);}}catch{}},1000);
      return()=>{window.removeEventListener("online",onOnline);if(cosmeticsTimer!==null)window.clearInterval(cosmeticsTimer);s?.disconnect();};
    };
    void start();
    return()=>{cancelled=true;if(cosmeticsTimer!==null)window.clearInterval(cosmeticsTimer);s?.disconnect();};
  },[roomCode,roomSize,loadProfile,loadChatHistory,recover,clearRollRequest]);

  const [pendingMove,setPendingMove]=useState<DiceValue|null>(null);
  const setPendingMoveRef=(value:DiceValue|null,mine:boolean)=>setPendingMove(mine?value:null);

  const animateMove=useCallback(async(move:MoveEvent)=>{
    if(!mountedRef.current)return;animationRef.current=true;setAnimating(true);
    const [color,idText]=String(move.tokenId).split(":");const id=Number(idText);if(!COLORS.includes(color as Color)||!Number.isInteger(id)){animationRef.current=false;setAnimating(false);return;}
    const from=Number(move.from);const contact=Number(move.captureToCenter?(move.captureProgress??move.to??move.target):(move.to??move.target));const finalTo=Number(move.finalTo??(move.captureToCenter?FINISH_PROGRESS:contact));
    const update=(position:number)=>setTokens(prev=>prev.map(t=>t.color===color&&t.id===id?{...t,position,state:tokenState(position)}:t));
    update(from);
    if(Number.isFinite(contact)&&contact!==from){const step=contact>from?1:-1;for(let position=from+step;;position+=step){await new Promise(resolve=>window.setTimeout(resolve,280));if(!mountedRef.current)return;update(position);if(position===contact)break;}}
    if(move.captureToCenter&&move.captured){setTokens(prev=>prev.map(t=>t.color===move.captured?.color&&t.id===move.captured?.id?{...t,position:0,state:"yard"}:t));await new Promise(resolve=>window.setTimeout(resolve,280));}
    if(finalTo!==contact&&Number.isFinite(finalTo)){await new Promise(resolve=>window.setTimeout(resolve,280));if(!mountedRef.current)return;update(finalTo);}
    const next=moveQueueRef.current.shift();if(next){await animateRef.current(next);return;}animationRef.current=false;setAnimating(false);setTokens(authoritativeRef.current.map(t=>({...t})));
  },[]);
  useEffect(()=>{animateRef.current=animateMove;},[animateMove]);

  const players=useMemo(()=>mergePlayers(game?.players||[],roster),[game?.players,roster]);
  const mine=players.find(p=>String(p.playerId)===String(me))||players[0];
  const opponent=players.find(p=>String(p.playerId)!==String(me));
  const myColors=useMemo<Color[]>(()=>mine?.colors?.length?mine.colors:(playerColorsForSeats(roomSize,Number(mine?.seat)||0) as Color[]),[mine,roomSize]);
  const myTurn=!!game&&connected&&game.status==="playing"&&String(game.currentPlayerId||"")===String(me);
  const legalTokenKeys=useMemo(()=>{if(pendingMove===null||!myTurn)return[];const source=authoritativeRef.current;return source.filter(t=>myColors.includes(t.color)&&canMove(source,t,pendingMove)).map(t=>`${t.color}-${t.id}`);},[pendingMove,myTurn,myColors,game?.stateRevision]);

  const chooseToken=useCallback((color:Color,id:number)=>{if(!socket?.connected||!game||!myTurn||pendingMove===null||moveRequestRef.current)return;const source=authoritativeRef.current;const token=source.find(t=>t.color===color&&t.id===id);if(!token||!myColors.includes(color)||!canMove(source,token,pendingMove))return;moveRequestRef.current=true;setActionBusy(true);socket.emit("game-move",{tokenId:`${color}:${id}`},(ack:{ok?:boolean})=>{if(!ack?.ok){moveRequestRef.current=false;setActionBusy(false);recover(socket);}});},[socket,game,myTurn,pendingMove,myColors,recover]);
  const handleRoll=useCallback(()=>{if(!socket?.connected||!game||!myTurn||pendingMove!==null||rollRequestRef.current||moveRequestRef.current)return;rollRequestRef.current=true;setActionBusy(true);if(rollTimerRef.current!==null)window.clearTimeout(rollTimerRef.current);rollTimerRef.current=window.setTimeout(()=>{clearRollRequest();recover(socket);},5000);socket.emit("game-roll",(ack:{ok?:boolean})=>{if(!ack?.ok)clearRollRequest();});},[socket,game,myTurn,pendingMove,recover,clearRollRequest]);

  const sendChat=useCallback(async(value=chatText)=>{const text=value.trim();if(!text||!socket?.connected||sendingChatRef.current)return;sendingChatRef.current=true;try{const response=await fetch("/api/multiplayer-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({roomCode,text}),cache:"no-store"});const data=await response.json().catch(()=>null);if(!response.ok||!data?.message?.id)return;setChatText("");socket.emit("chat",{text,messageId:String(data.message.id)});}finally{sendingChatRef.current=false;}},[chatText,roomCode,socket]);
  const toggleSound=()=>{const next=!soundEnabled;setSoundEnabled(next);try{const saved=JSON.parse(localStorage.getItem("ludo-settings")||"{}");localStorage.setItem("ludo-settings",JSON.stringify({...saved,sound:next}));}catch{}};
  const confirmLeave=()=>{setLeaveConfirmOpen(false);socket?.emit("leave-room");window.setTimeout(()=>{window.location.href="/lobby";},400);};

  const statusText=game?.status==="finished"?(game.winnerId===me?"YOU WON":"MATCH FINISHED"):myTurn?"YOUR TURN":"OPPONENT'S TURN";
  const meName=mine?.name||profile.name;const opponentName=opponent?.name||"Opponent";
  const commMembers=players.map(player=>({id:String(player.playerId),playerId:String(player.playerId),name:player.name,role:player.host?"host":"member",online:player.connected!==false,peerId:player.peerId}));
  const diceDisabled=!myTurn||pendingMove!==null||!connected||game?.status!=="playing"||rollRequestRef.current||moveRequestRef.current;

  return <main className="mp-page"><div className="mp-shell">
    <header className="mp-header">
      <div className="mp-player-card"><div className="mp-avatar"><PlayerAvatar src={mine?.avatar||profile.avatar}/></div><div className="mp-player-copy"><strong>{meName} <span>YOU</span></strong><small className="mp-player-level">⭐ {mine?.level??profile.level}</small><small><i className="mp-online-dot"/> Connected</small></div></div>
      <div className="mp-brand"><strong>♛ LUDO</strong><span>LIVE</span></div>
      <div className="mp-player-card mp-player-card-opponent"><div className="mp-avatar"><PlayerAvatar src={opponent?.avatar}/></div><div className="mp-player-copy"><strong>{opponentName}</strong><small className="mp-player-level">⭐ {opponent?.level??1}</small><small><i className={`mp-online-dot ${opponent?.connected===false?"off":"busy"}`}/> {opponent?.connected===false?"Disconnected":"In match"}</small></div></div>
    </header>

    <section className="mp-board-section"><StakeDisplay roomCode={roomCode}/><div className="mp-board-frame"><CanonicalLudoBoard theme={cosmetics.board} yardSkin={cosmetics.yard} demoTokens={tokens} legalTokenKeys={legalTokenKeys} onTokenClick={chooseToken}/></div></section>

    <section className="mp-control-section">
      <div className="mp-info-card"><div className="mp-info-name">{meName}</div><div className="mp-info-level">⭐ {mine?.level??profile.level}</div><div className="mp-info-coins">🪙 {(Number(mine?.coins)||profile.coins).toLocaleString()}</div></div>
      <div className="mp-turn-card"><div className={`mp-turn-label ${myTurn?"mine":""}`}><span/>{statusText}</div><div className="mp-turn-note">{game?.status==="playing"?(myTurn?"Roll the dice to play":"Wait for the other player to move"):connectionMessage}</div><DemoDice value={roll} onRoll={handleRoll} disabled={diceDisabled} botRolling={remoteRolling} skin={cosmetics.dice}/></div>
      <div className="mp-tools"><button type="button" className={`mp-tool ${chatOpen||chatUnread?"active":""}`} onClick={()=>setChatOpen(true)}><span>💬</span><small>Chat{chatUnread?" •":""}</small></button><div className="mp-tool"><ChatVoice roomCode={roomCode} playerId={me} members={commMembers} socket={socket}/><small>Mic</small></div></div>
    </section>

    <div className="mp-bottom-bar"><button type="button" className="danger" onClick={()=>setLeaveConfirmOpen(true)}>↩ Leave Match</button><button type="button" onClick={()=>setPlayersOpen(true)}>👥 Players</button><button type="button" onClick={toggleSound}>{soundEnabled?"🔊 Sound":"🔇 Sound"}</button><div className="mp-connection">● {connected?"Connected":"Reconnecting…"}</div><div className="mp-room">🛡️ Room ID: {roomCode}</div></div>
  </div>

  <ChatPanel open={chatOpen} messages={chatMessages} me={me} value={chatText} setValue={setChatText} onSend={sendChat} onClose={()=>setChatOpen(false)} onReaction={sendChat}/>
  {playersOpen&&<div className="mp-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPlayersOpen(false);}}><section className="mp-players-modal" role="dialog" aria-modal="true"><div className="mp-chat-head"><strong>Players</strong><button type="button" onClick={()=>setPlayersOpen(false)} aria-label="Close players">×</button></div>{players.map(player=><div className="mp-roster-row" key={player.playerId}><span className="mp-roster-dot"/><strong>{player.name}{String(player.playerId)===String(me)?" (You)":""}</strong><small>{player.connected===false?"Disconnected":"Connected"}</small></div>)}</section></div>}
  <LudoConfirmModal open={leaveConfirmOpen} title="Leave match?" message="Leaving now will end your participation in this room." confirmLabel="Leave" cancelLabel="Stay" onConfirm={confirmLeave} onCancel={()=>setLeaveConfirmOpen(false)} danger/>
  </main>;
}
