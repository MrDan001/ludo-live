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
    .online-gold-luxury .mp-clean{background:radial-gradient(circle at 50% -12%,rgba(226,183,71,.18),transparent 34%),radial-gradient(circle at 50% 58%,rgba(151,104,24,.08),transparent 48%),linear-gradient(180deg,#080604 0%,#030303 100%)!important}
    .online-gold-luxury .mp-stage{max-width:760px!important;width:100%!important;height:100dvh!important;margin:0 auto!important;padding:8px 9px max(8px,env(safe-area-inset-bottom))!important;box-sizing:border-box!important;display:flex!important;flex-direction:column!important;gap:8px!important;overflow-y:auto!important;overflow-x:hidden!important;scrollbar-width:none!important}
    .online-gold-luxury .mp-stage::-webkit-scrollbar{display:none!important}

    /* PREMIUM REFERENCE HUD — portrait-first */
    .online-gold-luxury .mp-team{position:relative!important;flex:0 0 88px!important;min-height:88px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;padding:7px 58px 7px 7px!important;border-color:rgba(224,184,76,.72)!important;border-radius:26px!important;background:linear-gradient(145deg,rgba(28,20,8,.96),rgba(5,5,4,.98))!important;box-shadow:0 7px 24px rgba(0,0,0,.48),inset 0 1px rgba(255,231,148,.14)!important;overflow:visible!important}
    .online-gold-luxury .mp-team:before{content:"♛\\A LUDO\\A LIVE";white-space:pre;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;text-align:center;font-family:Georgia,serif;font-weight:900;line-height:.72;font-size:20px;letter-spacing:.5px;color:#f4d36b;text-shadow:0 0 12px rgba(245,195,61,.7),0 3px 10px #000;pointer-events:none}
    .online-gold-luxury .mp-team:after{content:"☰";position:absolute;right:9px;top:50%;transform:translateY(-50%);width:45px;height:48px;display:grid;place-items:center;border:1px solid rgba(211,166,55,.75);border-radius:16px;background:linear-gradient(145deg,#191309,#070706);color:#f3c943;font-size:25px;line-height:1;z-index:5;pointer-events:none}
    .online-gold-luxury .mp-team>.mp-player{position:relative!important;z-index:6;flex:0 1 42%!important;width:42%!important;min-width:0!important;height:72px!important;min-height:72px!important;border:1px solid rgba(211,166,55,.62)!important;border-radius:22px!important;background:linear-gradient(145deg,rgba(27,22,13,.98),rgba(7,7,6,.98))!important;box-shadow:inset 0 1px rgba(255,235,164,.08),0 6px 18px rgba(0,0,0,.32)!important;overflow:hidden!important}
    .online-gold-luxury .mp-team>.mp-player.active{border-color:#efd26a!important;box-shadow:0 0 18px rgba(225,184,69,.26),inset 0 0 15px rgba(225,184,69,.05)!important}
    .online-gold-luxury .mp-team>.mp-player.mine{border-color:rgba(224,184,76,.58)!important}
    .online-gold-luxury .mp-team>.mp-player *{max-width:100%!important}

    /* Make the board the hero: no giant vertical centering gap. */
    .online-gold-luxury .mp-stage>.mp-board-wrap{flex:0 0 auto!important;min-height:0!important;width:100%!important;height:auto!important;max-width:none!important;aspect-ratio:auto!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;overflow:visible!important;border-radius:0!important;margin:0!important}
    .online-gold-luxury .mp-stage>.mp-board-wrap>.mp-board-wrap{flex:0 0 auto!important;width:min(calc(100vw - 18px),700px)!important;max-width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:1/1!important;overflow:visible!important;border-radius:22px!important;display:block!important;margin:0 auto!important;box-shadow:0 0 0 2px rgba(232,190,67,.5),0 12px 35px rgba(0,0,0,.55)!important}
    .online-gold-luxury .mp-stage>.mp-board-wrap>.mp-board-wrap>div:first-child{width:100%!important;height:auto!important;aspect-ratio:1/1!important}
    .online-gold-luxury .mp-stage>.mp-board-wrap>.mp-board-wrap>.mp-overlay{position:absolute!important;inset:0!important}

    /* Bottom control area becomes the compact premium command deck. */
    .online-gold-luxury .mp-bottom{position:relative!important;flex:0 0 auto!important;min-height:210px!important;margin-top:2px!important;padding:10px!important;border:1px solid rgba(224,184,76,.62)!important;border-radius:24px!important;background:linear-gradient(145deg,rgba(24,18,8,.97),rgba(5,5,4,.98))!important;box-shadow:0 -4px 24px rgba(0,0,0,.34),inset 0 1px rgba(255,231,148,.1)!important}
    .online-gold-luxury .mp-live-dot{box-shadow:0 0 10px #d8ad3c!important}
    .online-gold-luxury .mp-dice{filter:drop-shadow(0 8px 16px rgba(0,0,0,.4))!important}

    /* Remove the debug-looking voice toast from the visible game HUD. */
    .online-gold-luxury .voice-notice,.online-gold-luxury [class*="voice-notice"]{display:none!important}

    @media(max-width:700px){
      .online-gold-luxury .mp-stage{padding:6px 8px max(10px,env(safe-area-inset-bottom))!important;gap:7px!important}
      .online-gold-luxury .mp-team{flex-basis:82px!important;min-height:82px!important;border-radius:23px!important;padding-right:55px!important}
      .online-gold-luxury .mp-team:before{font-size:17px!important}
      .online-gold-luxury .mp-team:after{width:43px!important;height:45px!important;font-size:23px!important}
      .online-gold-luxury .mp-team>.mp-player{height:68px!important;min-height:68px!important;border-radius:20px!important}
      .online-gold-luxury .mp-stage>.mp-board-wrap>.mp-board-wrap{width:min(calc(100vw - 16px),700px)!important;border-radius:20px!important}
      .online-gold-luxury .mp-bottom{min-height:198px!important;border-radius:22px!important;padding:8px!important}
    }
    @media(max-width:420px){
      .online-gold-luxury .mp-stage{padding:5px 6px max(8px,env(safe-area-inset-bottom))!important;gap:6px!important}
      .online-gold-luxury .mp-team{flex-basis:76px!important;min-height:76px!important;padding:5px 51px 5px 5px!important;border-radius:21px!important}
      .online-gold-luxury .mp-team:before{font-size:14px!important}
      .online-gold-luxury .mp-team:after{right:7px;width:40px!important;height:42px!important;border-radius:14px!important;font-size:21px!important}
      .online-gold-luxury .mp-team>.mp-player{height:62px!important;min-height:62px!important;border-radius:18px!important}
      .online-gold-luxury .mp-stage>.mp-board-wrap>.mp-board-wrap{width:calc(100vw - 12px)!important;border-radius:18px!important}
      .online-gold-luxury .mp-bottom{min-height:190px!important;border-radius:20px!important}
    }
    @media(max-height:650px){
      .online-gold-luxury .mp-team{flex-basis:64px!important;min-height:64px!important}
      .online-gold-luxury .mp-team>.mp-player{height:52px!important;min-height:52px!important}
      .online-gold-luxury .mp-stage>.mp-board-wrap>.mp-board-wrap{width:min(calc(100vw - 12px),560px)!important}
      .online-gold-luxury .mp-bottom{min-height:160px!important}
    }
  `}</style></div>:null;
}
