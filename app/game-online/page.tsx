"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MultiplayerGame from "../game/MultiplayerGame";

export default function OnlineGamePage(){
  const params=useSearchParams();
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const board=String(params.get("board")||"").trim();
    if(!board){setReady(true);return;}
    try{localStorage.setItem("ludo-match-board",board)}catch{}
    const originalFetch=window.fetch.bind(window);
    window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
      if(url.includes("/api/customization")){
        return new Response(JSON.stringify({equippedBoard:board}),{status:200,headers:{"Content-Type":"application/json"}});
      }
      return originalFetch(input,init);
    };
    setReady(true);
    return()=>{window.fetch=originalFetch};
  },[params]);
  return ready?<div className="online-gold-luxury"><MultiplayerGame/><style jsx global>{`
    html,body{background:#050301!important;overflow:hidden!important}
    .online-gold-luxury .mp-clean{
      background:
        radial-gradient(circle at 50% -12%,rgba(226,183,71,.18),transparent 34%),
        radial-gradient(circle at 50% 58%,rgba(151,104,24,.08),transparent 48%),
        linear-gradient(180deg,#080604 0%,#030303 100%)!important;
    }
    .online-gold-luxury .mp-stage{
      max-width:520px!important;
      grid-template-rows:auto minmax(0,1fr) auto!important;
      gap:10px!important;
      padding:10px 9px max(9px,env(safe-area-inset-bottom))!important;
    }
    .online-gold-luxury .mp-team{
      border-color:rgba(224,184,76,.58)!important;
      background:linear-gradient(145deg,rgba(28,20,8,.92),rgba(8,7,5,.94))!important;
      box-shadow:0 5px 22px rgba(0,0,0,.45),inset 0 1px rgba(255,231,148,.12)!important;
    }
    .online-gold-luxury .mp-player.active{
      border-color:#e5c45d!important;
      box-shadow:0 0 18px rgba(225,184,69,.28),inset 0 0 16px rgba(225,184,69,.05)!important;
    }
    .online-gold-luxury .mp-player.mine{border-color:rgba(224,184,76,.24)!important}
    .online-gold-luxury .mp-board-wrap{
      min-height:0!important;
      width:100%!important;
      height:auto!important;
      aspect-ratio:1/1!important;
      overflow:visible!important;
      display:grid!important;
      place-items:center!important;
      border-radius:22px!important;
    }
    .online-gold-luxury .mp-stage>.mp-board-wrap{
      width:min(100%,calc(100dvh - 185px))!important;
      max-width:calc(100vw - 18px)!important;
      max-height:none!important;
      justify-self:center!important;
      align-self:center!important;
    }
    .online-gold-luxury .mp-stage>.mp-board-wrap>.mp-board-wrap{
      width:100%!important;
      height:100%!important;
      aspect-ratio:1/1!important;
      max-width:none!important;
      max-height:none!important;
      overflow:visible!important;
    }
    .online-gold-luxury .mp-stage>.mp-board-wrap>.mp-board-wrap>div:not(.mp-overlay){
      width:100%!important;height:100%!important;aspect-ratio:1/1!important;
    }
    .online-gold-luxury .mp-bottom{
      min-height:74px!important;
      border-color:rgba(224,184,76,.56)!important;
      background:linear-gradient(145deg,rgba(24,18,8,.96),rgba(7,6,4,.97))!important;
      box-shadow:0 -8px 28px rgba(0,0,0,.42),inset 0 1px rgba(255,231,148,.1)!important;
    }
    .online-gold-luxury .mp-live-dot{box-shadow:0 0 10px #d8ad3c!important}
    .online-gold-luxury .mp-dice{filter:drop-shadow(0 8px 16px rgba(0,0,0,.35))}
    @media(max-height:700px){
      .online-gold-luxury .mp-stage{gap:6px!important;padding-top:6px!important}
      .online-gold-luxury .mp-stage>.mp-board-wrap{width:min(100%,calc(100dvh - 155px))!important}
      .online-gold-luxury .mp-team{min-height:52px!important}
      .online-gold-luxury .mp-bottom{min-height:62px!important}
    }
  `}</style></div>:null;
}
