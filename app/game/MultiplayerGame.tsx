"use client";
import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import AppFrame from "../_components/AppFrame";
import LudoBoard, { BOARD_PALETTES, type BoardThemeId, type DemoToken } from "../_components/LudoBoardGame";
import DemoDice from "../_components/DemoDice";

type Color = "red"|"yellow"|"green"|"blue";
type Face = 1|2|3|4|5|6;
type ServerPlayer = { playerId:string; name:string; seat:number };
type ServerTokenMap = Record<string,Record<string,{position:number}>>;
type GameState = { status:string; currentPlayerId:string|null; dice:Face|null; pendingMove:Face|null; sixStreak:number; players:ServerPlayer[]; tokens:ServerTokenMap };
const COLORS:Color[]=["red","yellow","green","blue"];
const STEP_COUNT=56;
const initialTokens=():DemoToken[]=>COLORS.flatMap(color=>Array.from({length:4},(_,id)=>({color,id,position:0,state:"yard" as const})));
const playerColors=(players:ServerPlayer[],pid:string):Color[]=>{const seat=players.find(p=>p.playerId===pid)?.seat??0;return players.length===2?(seat===0?["red","yellow"]:["green","blue"]):[COLORS[seat]||"red"]};
const targetFor=(position:number,roll:Face)=>position===0?(roll===6?1:-1):position+roll;
const legalTarget=(position:number,roll:Face)=>{const target=targetFor(position,roll);return target>=0&&target<=STEP_COUNT&&!(position===0&&roll!==6)};
const displayTheme=(value:string):BoardThemeId=>value==="midnight-live"?"night":(value in BOARD_PALETTES?value as BoardThemeId:"classic");

export default function MultiplayerGame(){
 const [theme,setTheme]=useState<BoardThemeId>("classic");
 const [socket,setSocket]=useState<Socket|null>(null);
 const [me,setMe]=useState("");
 const [game,setGame]=useState<GameState|null>(null);
 const [tokens,setTokens]=useState<DemoToken[]>(initialTokens);
 const [roll,setRoll]=useState<Face>(1);
 const [pending,setPending]=useState<Face|null>(null);
 const [remoteRolling,setRemoteRolling]=useState(false);
 const [notice,setNotice]=useState("Connecting…");
 const [animating,setAnimating]=useState(false);
 const players=game?.players||[];
 const myColors=useMemo(()=>playerColors(players,me),[players,me]);
 const currentId=game?.currentPlayerId||"";
 const myTurn=currentId===me;
 const applyServerTokens=(serverTokens:ServerTokenMap)=>setTokens(prev=>prev.map(t=>{const position=serverTokens?.[t.color]?.[String(t.id)]?.position;if(typeof position!=="number")return t;return {...t,position,state:position===STEP_COUNT?"finished":position>51?"home":position===0?"yard":"track"}}));
 const hasLegalMove=(r:Face)=>myColors.some(color=>tokens.some(t=>t.color===color&&legalTarget(t.position,r)));
 useEffect(()=>{try{const saved=localStorage.getItem("ludo-match-board");if(saved)setTheme(displayTheme(saved));}catch{}},[]);
 useEffect(()=>{
  let alive=true;
  (async()=>{
   let pid="";try{const a=await fetch("/api/auth",{cache:"no-store"}).then(x=>x.json());pid=String(a?.user?.id||"")}catch{}
   if(!alive)return;setMe(pid);
   const s=io(location.origin,{transports:["websocket","polling"]});setSocket(s);
   s.on("connect",()=>setNotice("LIVE MATCH"));
   s.on("game-state",(g:GameState)=>{if(!alive)return;setGame(g);applyServerTokens(g.tokens||{});setPending(g.currentPlayerId===pid?g.pendingMove:null);setRoll(g.dice||1);setNotice(g.currentPlayerId===pid?(g.pendingMove?`You rolled ${g.pendingMove}. Pick a token.`:"Your turn — roll the dice."):`${g.players.find(p=>p.playerId===g.currentPlayerId)?.name||"Player"}'s turn.`)});
   s.on("game-dice",({playerId,value}:{playerId:string;value:Face})=>{setRoll(value);if(playerId===pid){setPending(value);setNotice(`You rolled ${value}. Pick a token.`)}else{setRemoteRolling(true);setNotice("Opponent is rolling…");window.setTimeout(()=>setRemoteRolling(false),950)}});
   s.on("game-moved",({tokenId,to}:{playerId:string;tokenId:string;to:number})=>{if(tokenId!=="__skip__"){const [colorRaw,idRaw]=String(tokenId).split(":");const color=colorRaw as Color;const tokenIdNum=Number(idRaw);setAnimating(true);setTokens(prev=>prev.map(t=>t.color===color&&t.id===tokenIdNum?{...t,position:to,state:to===STEP_COUNT?"finished":to>51?"home":to===0?"yard":"track"}:t));window.setTimeout(()=>setAnimating(false),350)}setPending(null)});
   s.on("disconnect",()=>setNotice("Reconnecting…"));return()=>{alive=false;s.disconnect()};
  })();return()=>{alive=false};
 },[]);
 useEffect(()=>{if(!socket||!game||!myTurn||pending==null)return;if(hasLegalMove(pending))return;const r=pending;setPending(null);socket.emit("game-move",{tokenId:"__skip__",to:0});setNotice(r===6?"No legal move — bonus roll.":"No legal move — turn passes.")},[socket,game,myTurn,pending,tokens,myColors]);
 const chooseToken=(color:Color,id:number)=>{if(!socket||!game||!myTurn||pending==null||animating||!myColors.includes(color))return;const t=tokens.find(x=>x.color===color&&x.id===id);if(!t||!legalTarget(t.position,pending))return;const target=targetFor(t.position,pending);setPending(null);socket.emit("game-move",{tokenId:`${color}:${id}`,to:target});setNotice("Moving…")};
 const handleRoll=()=>{if(!socket||!game||!myTurn||pending!==null||animating)return;socket.emit("game-roll")};
 const p=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;
 return <AppFrame back="/lobby"><main style={{...page,background:p.bg} as React.CSSProperties}>
   <header style={top}><div style={liveTitle}>LIVE MATCH</div></header>
   <section style={boardWrap}><div style={boardShell}><LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken}/></div></section>
   <section style={controls}>
    <div style={controlCopy}><div style={turnLabel}>{myTurn?"YOUR TURN":currentId?`${players.find(pl=>pl.playerId===currentId)?.name||"PLAYER"} TURN`:"MATCH"}</div><b style={headline}>{pending!==null?"Pick a token":"Roll the dice"}</b><p style={sub}>{notice}</p></div>
    <DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn||pending!==null||animating||!game} botRolling={remoteRolling}/>
   </section>
  </main></AppFrame>;
}
const page:React.CSSProperties={width:"100%",minHeight:"calc(100vh - 40px)",padding:"12px 12px 24px",boxSizing:"border-box",borderRadius:22};
const top:React.CSSProperties={display:"flex",justifyContent:"center",alignItems:"center",marginBottom:8};
const liveTitle:React.CSSProperties={fontSize:"clamp(26px,7vw,44px)",letterSpacing:5,fontWeight:950,color:"#f8fbff",textShadow:"0 0 12px rgba(65,177,255,.85),0 0 30px rgba(45,126,255,.55)",animation:"livePulse 1.8s ease-in-out infinite",textAlign:"center"};
const boardWrap:React.CSSProperties={display:"grid",placeItems:"center",marginTop:2};
const boardShell:React.CSSProperties={width:"100%",maxWidth:620,position:"relative",filter:"drop-shadow(0 12px 28px rgba(0,110,255,.22))"};
const controls:React.CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:14,padding:"16px 14px",borderRadius:22,background:"linear-gradient(135deg,#06162f,#081f42)",border:"1px solid #2a6bd2",boxShadow:"0 0 24px rgba(28,115,255,.22),0 12px 30px rgba(0,0,0,.22)"};
const controlCopy:React.CSSProperties={minWidth:0,flex:1};
const turnLabel:React.CSSProperties={fontSize:11,letterSpacing:2,color:"#62b4ff",fontWeight:900,textTransform:"uppercase"};
const headline:React.CSSProperties={display:"block",fontSize:24,lineHeight:1.15,marginTop:5,color:"#fff"};
const sub:React.CSSProperties={color:"#a9c0e5",margin:"6px 0 0",fontSize:14,lineHeight:1.25};

if(typeof document!=="undefined"&&!document.getElementById("live-match-animations")){const s=document.createElement("style");s.id="live-match-animations";s.textContent="@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.82;transform:scale(1.025)}}";document.head.appendChild(s)}
