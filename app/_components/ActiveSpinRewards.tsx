"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Notice = { spins:number; xp:number; rush:boolean };

function isGameSession(pathname:string){
  // /game is the canonical Human-vs-Bot game surface.
  // Keep it in the same verified active-time contract as multiplayer and tournament play.
  return pathname === "/room" || pathname.startsWith("/room/") || pathname === "/game" || pathname.startsWith("/game/") || pathname === "/game-online" || pathname.startsWith("/game-online/") || pathname === "/tournament/game" || pathname.startsWith("/tournament/game/");
}

export default function ActiveSpinRewards(){
  const pathname=usePathname();
  useEffect(()=>{
    if(!isGameSession(pathname||""))return;
    let alive=true;let timer:number|undefined;
    const heartbeat=async()=>{
      if(document.visibilityState!=="visible"||!isGameSession(window.location.pathname))return;
      try{
        const r=await fetch("/api/spin/activity",{method:"POST",cache:"no-store"});
        if(!r.ok)return;const d=await r.json();
        if(!alive||(!Number(d?.granted)&&!Number(d?.xpGranted)))return;
        const granted=Number(d.granted)||0;
        const xp=Number(d.xpGranted)||0;
        const rush=Boolean(d.boostWindow);
        setNotice({spins:granted,xp,rush});
        window.dispatchEvent(new Event("ludo-spin-updated"));
        window.dispatchEvent(new CustomEvent("ludo-progression-updated",{detail:{level:Number(d.level)||1,xp:Number(d.xp)||0}}));
        if(typeof Notification!=="undefined"&&Notification.permission==="granted")new Notification("🎉 Active Play Reward!",{body:`+${granted} free ${granted===1?"spin":"spins"} and +${xp} XP${rush?" (Rush Hour)":""}.`});
        window.setTimeout(()=>alive&&setNotice(null),6500);
      }catch{}
    };
    heartbeat();timer=window.setInterval(heartbeat,60000);
    const visible=()=>{if(document.visibilityState==="visible")heartbeat()};document.addEventListener("visibilitychange",visible);
    return()=>{alive=false;if(timer)clearInterval(timer);document.removeEventListener("visibilitychange",visible)};
  },[pathname]);
  if(!notice)return null;
  return <div style={toast}><span style={{fontSize:28}}>🎉</span><div><b>{notice.rush?"Rush Hour Reward":"Active Play Reward"}</b><small>+{notice.spins} {notice.spins===1?"spin":"spins"} • +{notice.xp} XP</small></div><button onClick={()=>setNotice(null)} aria-label="Close notification">×</button></div>;
}
const toast:React.CSSProperties={position:"fixed",top:18,right:14,zIndex:1000,display:"flex",alignItems:"center",gap:10,maxWidth:"calc(100vw - 28px)",padding:"12px 14px",borderRadius:14,background:"linear-gradient(135deg,#126b3b,#159447)",border:"1px solid #54e78d",boxShadow:"0 12px 35px rgba(0,0,0,.45)",color:"#fff"};
