"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppFrame from "../_components/AppFrame";
import FreePlayRoom from "../_components/FreePlayRoom";

function FreePlayContent() {
  const params = useSearchParams();
  const room = (params.get("room") || "").trim().toUpperCase();
  const size = Number(params.get("size") || "2") === 4 ? 4 : 2;
  const mode = params.get("mode") || "";

  if (!room && mode !== "create" && mode !== "join") {
    return (
      <AppFrame back="/lobby">
        <div style={{maxWidth:520,margin:"0 auto",paddingBottom:40}}>
          <h1 style={{fontSize:38,marginBottom:6}}>🎮 Free Play</h1>
          <p style={{color:"#94a3b8",lineHeight:1.6}}>Play live multiplayer Ludo without coins or stakes. Choose what you want to do.</p>
          <div style={{display:"grid",gap:12,marginTop:24}}>
            <a href="/free-play?mode=create" style={choicePrimary}>➕ Create Free Room<span>Create a new no-stakes room and share its code.</span></a>
            <a href="/free-play?mode=join" style={choiceSecondary}>🔑 Join Free Room<span>Enter a friend's Free Play room code.</span></a>
          </div>
        </div>
      </AppFrame>
    );
  }

  return <FreePlayRoom initialCode={room} initialSize={size} create={mode === "create" && !room} />;
}

export default function FreePlayPage() {
  return <Suspense fallback={<AppFrame back="/lobby"><p>Loading Free Play…</p></AppFrame>}><FreePlayContent /></Suspense>;
}

const choicePrimary={display:"grid",gap:5,padding:20,borderRadius:18,background:"linear-gradient(135deg,#065f46,#064e3b)",border:"1px solid rgba(74,222,128,.4)",color:"#fff",textDecoration:"none",fontSize:20,fontWeight:900};
const choiceSecondary={display:"grid",gap:5,padding:20,borderRadius:18,background:"linear-gradient(135deg,#0b2a62,#071127)",border:"1px solid rgba(96,165,250,.3)",color:"#fff",textDecoration:"none",fontSize:20,fontWeight:900};