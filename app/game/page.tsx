"use client";

import { useEffect, useState } from "react";
import BoardPage from "../board/page";
import { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId } from "../_components/LudoBoardGame";

const resolveTheme = (value: unknown): BoardThemeId => {
  const id = String(value || "");
  if (id === "midnight-live") return "night";
  return id in BOARD_PALETTES ? id as BoardThemeId : "classic";
};

const themeIcon = (theme: BoardThemeId) => {
  const name = String(BOARD_NAMES[theme] || "").toLowerCase();
  if (name.includes("love") || name.includes("valentine")) return "💗";
  if (name.includes("christmas") || name.includes("winter")) return "🎄";
  if (name.includes("dragon") || name.includes("fire")) return "🐉";
  if (name.includes("galaxy") || name.includes("space")) return "🌌";
  if (name.includes("gold") || name.includes("royal")) return "👑";
  if (name.includes("ocean") || name.includes("aqua")) return "🌊";
  if (name.includes("forest") || name.includes("nature")) return "🌿";
  if (theme === "night") return "🌙";
  return "🎲";
};

export default function GamePage(){
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const p = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const skinName = BOARD_NAMES[theme] || "Classic";
  const icon = themeIcon(theme);

  useEffect(() => {
    let active = true;
    const loadSkin = async () => {
      try {
        const saved = localStorage.getItem("ludo-match-board");
        if (saved && saved in BOARD_PALETTES) {
          if (active) setTheme(resolveTheme(saved));
        }
      } catch {}
      try {
        const response = await fetch("/api/customization", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) {
          const equipped = resolveTheme(data?.equippedBoard);
          setTheme(equipped);
          try { localStorage.setItem("ludo-match-board", equipped); } catch {}
        }
      } catch {}
    };
    loadSkin();
    return () => { active = false; };
  }, []);

  return (
    <main
      style={{
        minHeight:"100vh",
        position:"relative",
        overflowX:"hidden",
        color:"#fff",
        background:p.bg,
        transition:"background .35s ease",
      }}
      data-game-skin={theme}
      aria-label={`${skinName} game`}
    >
      <div
        aria-hidden="true"
        style={{
          position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
          opacity:.22, backgroundImage:p.pattern, backgroundSize:"auto, auto",
          mixBlendMode:"screen",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position:"fixed", top:-180, left:"50%", transform:"translateX(-50%)",
          width:"min(900px,140vw)", height:360, borderRadius:"50%",
          pointerEvents:"none", zIndex:0, background:p.accent, opacity:.08,
          filter:"blur(70px)",
        }}
      />

      <div style={{position:"relative",zIndex:10,padding:"12px 12px 0"}}>
        <header
          style={{
            position:"relative",
            minHeight:190,
            overflow:"hidden",
            borderRadius:"0 0 30px 30px",
            border:`1px solid ${p.accent}`,
            background:`linear-gradient(145deg, rgba(3,12,28,.96), ${p.accent}22, rgba(3,12,28,.94))`,
            boxShadow:p.shadow,
            display:"flex",
            flexDirection:"column",
            alignItems:"center",
            justifyContent:"center",
            textAlign:"center",
            padding:"24px 18px 28px",
          }}
        >
          <div aria-hidden="true" style={{position:"absolute",inset:0,backgroundImage:p.pattern,opacity:.32,mixBlendMode:"screen"}} />
          <div aria-hidden="true" style={{position:"absolute",top:-90,left:"50%",transform:"translateX(-50%)",width:280,height:220,borderRadius:"50%",background:p.accent,opacity:.16,filter:"blur(35px)"}} />

          <a
            href="/mood"
            aria-label="Back to game mode"
            style={{
              position:"absolute",top:14,left:14,zIndex:2,
              display:"inline-flex",alignItems:"center",gap:7,
              padding:"9px 13px",borderRadius:14,
              background:"rgba(2,10,24,.78)",border:`1px solid ${p.accent}`,
              color:"#fff",textDecoration:"none",fontWeight:900,fontSize:14,
              boxShadow:p.shadow,backdropFilter:"blur(10px)",
            }}
          >
            ← Back
          </a>

          <div style={{position:"relative",zIndex:1,fontSize:48,lineHeight:1,marginBottom:7,filter:`drop-shadow(0 5px 14px ${p.accent})`}}>{icon}</div>
          <div style={{position:"relative",zIndex:1,fontSize:11,fontWeight:950,letterSpacing:3,color:p.accent,textTransform:"uppercase"}}>Bot vs Human</div>
          <h1 style={{position:"relative",zIndex:1,margin:"5px 0 4px",fontSize:"clamp(28px,8vw,44px)",lineHeight:1,fontWeight:1000,letterSpacing:-1,textShadow:`0 3px 18px ${p.accent}`}}>{skinName}</h1>
          <div style={{position:"relative",zIndex:1,color:"#c9d7ed",fontSize:13,fontWeight:750}}>Equipped skin · ready to play</div>
          <div style={{position:"relative",zIndex:1,display:"inline-flex",alignItems:"center",gap:7,marginTop:11,padding:"6px 12px",borderRadius:999,background:"rgba(2,10,24,.7)",border:`1px solid ${p.accent}`,fontSize:11,fontWeight:950,letterSpacing:1.2}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:"#ff3158",boxShadow:"0 0 12px #ff3158",animation:"ludoPulse 1.3s ease-in-out infinite"}} /> LIVE
          </div>
        </header>
      </div>

      <style>{`@keyframes ludoPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.42;transform:scale(.72)}}`}</style>

      <div style={{position:"relative",zIndex:1,paddingTop:18}}>
        <BoardPage />
      </div>
    </main>
  );
}
