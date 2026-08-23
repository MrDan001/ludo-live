"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MultiplayerGame from "../game/MultiplayerGame";

export default function OnlineGamePage(){
  const params=useSearchParams();
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    try{
      const board=String(params.get("board")||"").trim();
      if(board) localStorage.setItem("ludo-match-board",board);
    }catch{}
    setReady(true);
  },[params]);
  return ready?<MultiplayerGame/>:null;
}
