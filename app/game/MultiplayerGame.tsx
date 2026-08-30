"use client";

import { useEffect, useState } from "react";
import MultiplayerGameCanonical from "./MultiplayerGameCanonical";
import InGameComms from "../_components/InGameComms";

export default function MultiplayerGame(){
 const [playerId,setPlayerId]=useState("");
 const [roomCode,setRoomCode]=useState("");
 useEffect(()=>{
  let dead=false;
  const load=async()=>{
   const params=new URLSearchParams(window.location.search);
   setRoomCode(params.get("room")||"");
   try{const r=await fetch("/api/auth",{cache:"no-store"});const d=await r.json();if(!dead)setPlayerId(String(d?.user?.id||""));}catch{}
  };
  void load();
  return()=>{dead=true};
 },[]);
 return <>
  <MultiplayerGameCanonical/>
  {roomCode&&playerId&&<InGameComms roomCode={roomCode} playerId={playerId}/>} 
 </>;
}
