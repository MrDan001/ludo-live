"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

type WinnerEvent={winnerId:string;winnerName:string;pot:number;reason:string;roomCode:string};

type PatchedSocket=Socket & {__ludoForfeitPatched?:boolean;__ludoForfeitPlayerId?:string};

const patchKey=Symbol.for("ludo.game-online.forfeit-celebration");
const proto=Socket.prototype as PatchedSocket & Record<symbol,boolean>;
if(!proto[patchKey]){
  proto[patchKey]=true;
  const originalOn=Socket.prototype.on;
  const originalEmit=Socket.prototype.emit;
  Socket.prototype.emit=function(this:PatchedSocket,event:string,...args:any[]){
    if(event==="join-room")this.__ludoForfeitPlayerId=String(args[0]?.playerId||"");
    return originalEmit.call(this,event,...args);
  } as typeof Socket.prototype.emit;
  Socket.prototype.on=function(this:PatchedSocket,event:string,listener:(...args:any[])=>void){
    if(event!=="game-forfeit-winner")return originalOn.call(this,event,listener);
    return originalOn.call(this,event,(payload:WinnerEvent)=>window.dispatchEvent(new CustomEvent("ludo-game-forfeit-winner",{detail:{...payload,playerId:this.__ludoForfeitPlayerId||""}})));
  } as typeof Socket.prototype.on;
}

export default function OnlineMultiplayerForfeitCelebration(){
  const [event,setEvent]=useState<WinnerEvent|null>(null);
  const [playerId,setPlayerId]=useState("");
  useEffect(()=>{
    let alive=true;
    fetch("/api/auth",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(alive)setPlayerId(String(d?.user?.id||""));}).catch(()=>{});
    const onWinner=(e:Event)=>{const detail=(e as CustomEvent<WinnerEvent&{playerId?:string}>).detail;if(!detail)return;setEvent(detail);if(detail.playerId)setPlayerId(String(detail.playerId));};
    window.addEventListener("ludo-game-forfeit-winner",onWinner);
    return()=>{alive=false;window.removeEventListener("ludo-game-forfeit-winner",onWinner);};
  },[]);
  if(!event)return null;
  const isWinner=String(playerId)===String(event.winnerId);
  return <div className="ludo-forfeit-overlay" role="dialog" aria-live="assertive">
    <style>{`@keyframes ludoWinnerPop{0%{transform:scale(.45) rotate(-8deg);opacity:0}65%{transform:scale(1.08) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}@keyframes ludoConfetti{0%{transform:translateY(-20vh) rotate(0);opacity:1}100%{transform:translateY(115vh) rotate(720deg);opacity:0}}@keyframes ludoGlow{0%,100%{filter:drop-shadow(0 0 10px rgba(255,215,0,.35))}50%{filter:drop-shadow(0 0 32px rgba(255,215,0,.95))}}.ludo-forfeit-overlay{position:fixed;inset:0;z-index:10000;background:radial-gradient(circle at 50% 42%,rgba(25,45,110,.92),rgba(2,5,18,.97) 68%);display:flex;align-items:center;justify-content:center;overflow:hidden;padding:20px;backdrop-filter:blur(7px)}.ludo-forfeit-card{position:relative;z-index:2;width:min(520px,94vw);text-align:center;padding:34px 22px 28px;border:2px solid rgba(250,204,21,.65);border-radius:28px;background:linear-gradient(145deg,rgba(15,31,78,.98),rgba(5,10,27,.98));box-shadow:0 24px 80px rgba(0,0,0,.65);animation:ludoWinnerPop .65s cubic-bezier(.2,.9,.25,1.2)}.ludo-forfeit-trophy{font-size:76px;line-height:1;animation:ludoGlow 1.3s infinite}.ludo-forfeit-title{margin:12px 0 4px;color:#facc15;font-size:clamp(34px,10vw,58px);font-weight:1000;letter-spacing:2px}.ludo-forfeit-subtitle{color:#fff;font-size:18px;font-weight:800}.ludo-forfeit-name{color:#facc15;font-size:24px;font-weight:1000;margin-top:8px}.ludo-forfeit-pot{margin:18px auto 0;padding:12px 18px;border-radius:18px;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.35);color:#fff;font-weight:900}.ludo-forfeit-pot b{color:#facc15;font-size:22px}.ludo-forfeit-note{margin:14px 0 0;color:#cbd5e1;font-size:13px;line-height:1.5}.ludo-forfeit-confetti{position:absolute;top:-12vh;width:9px;height:18px;border-radius:2px;animation:ludoConfetti linear infinite;opacity:.9}.ludo-forfeit-button{margin-top:22px;border:0;border-radius:14px;padding:12px 24px;background:#16a34a;color:#fff;font-weight:1000;font-size:15px;cursor:pointer}`}</style>
    {Array.from({length:44},(_,i)=><i key={i} className="ludo-forfeit-confetti" style={{left:`${(i*37)%101}%`,animationDuration:`${2.2+(i%7)*.35}s`,animationDelay:`-${(i%9)*.35}s`,transform:`rotate(${i*41}deg)`}}/>)}
    <div className="ludo-forfeit-card">
      <div className="ludo-forfeit-trophy">🏆</div>
      <div className="ludo-forfeit-title">{isWinner?"YOU WIN!":"MATCH OVER"}</div>
      <div className="ludo-forfeit-subtitle">{isWinner?"🎉 Congratulations! 🎉":"The match has ended."}</div>
      <div className="ludo-forfeit-name">{event.winnerName}</div>
      <div className="ludo-forfeit-pot">🪙 Winning pot: <b>{Number(event.pot||0).toLocaleString()} coins</b></div>
      <div className="ludo-forfeit-note">{isWinner?"Your opponent left the game, so you were automatically declared the last player standing. The winning coins have been awarded to your profile.":`${event.winnerName} was declared the last player standing after the opponent left.`}</div>
      <button type="button" className="ludo-forfeit-button" onClick={()=>{window.location.href="/lobby";}}>Return to Lobby</button>
    </div>
  </div>;
}
