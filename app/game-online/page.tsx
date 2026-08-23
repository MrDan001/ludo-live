"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MultiplayerGame from "../game/MultiplayerGameCanonical";

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
  return ready?<MultiplayerGame/>:null;
}
