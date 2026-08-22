"use client";

import { useEffect, useState } from "react";
import BoardPage from "../board/page";
import { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId } from "../_components/LudoBoardGame";

const resolveTheme = (value: unknown): BoardThemeId => {
  const id = String(value || "");
  if (id === "midnight-live") return "night";
  return id in BOARD_PALETTES ? id as BoardThemeId : "classic";
};

export default function GamePage(){
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const p = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;

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
      aria-label={`${BOARD_NAMES[theme]} game`}
    >
      <div
        aria-hidden="true"
        style={{
          position:"fixed",
          inset:0,
          pointerEvents:"none",
          zIndex:0,
          opacity:.22,
          backgroundImage:p.pattern,
          backgroundSize:"auto, auto",
          mixBlendMode:"screen",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position:"fixed",
          top:-180,
          left:"50%",
          transform:"translateX(-50%)",
          width:"min(900px,140vw)",
          height:360,
          borderRadius:"50%",
          pointerEvents:"none",
          zIndex:0,
          background:p.accent,
          opacity:.08,
          filter:"blur(70px)",
        }}
      />
      <a
        href="/mood"
        aria-label="Back to game mode"
        style={{
          position:"fixed",
          top:14,
          left:14,
          zIndex:100,
          display:"inline-flex",
          alignItems:"center",
          gap:7,
          padding:"9px 14px",
          borderRadius:12,
          background:"rgba(3,12,28,.84)",
          border:`1px solid ${p.accent}`,
          color:"#fff",
          textDecoration:"none",
          fontWeight:850,
          fontSize:14,
          boxShadow:p.shadow,
          backdropFilter:"blur(10px)",
          transition:"border-color .35s ease, box-shadow .35s ease",
        }}
      >
        ← Back
      </a>
      <div style={{position:"relative",zIndex:1}}>
        <BoardPage />
      </div>
    </main>
  );
}
