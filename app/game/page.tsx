"use client";

import { useEffect, useState } from "react";
import GameBoardContent from "./GameBoardContent";
import { BOARD_PALETTES, type BoardThemeId } from "../_components/LudoBoardGame";

const resolveTheme = (value: unknown): BoardThemeId => {
  const id = String(value || "");
  if (id === "midnight-live") return "night";
  return id in BOARD_PALETTES ? (id as BoardThemeId) : "classic";
};

export default function GamePage() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;

  useEffect(() => {
    let active = true;
    const loadEquippedSkin = async () => {
      try {
        const saved = localStorage.getItem("ludo-match-board");
        if (saved && (saved === "midnight-live" || saved in BOARD_PALETTES)) {
          if (active) setTheme(resolveTheme(saved));
        }
      } catch {}

      try {
        const response = await fetch("/api/customization", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const equipped = String(data?.equippedBoard || "");
        if (!active || !equipped || !(equipped === "midnight-live" || equipped in BOARD_PALETTES)) return;
        const resolved = resolveTheme(equipped);
        setTheme(resolved);
        try { localStorage.setItem("ludo-match-board", resolved); } catch {}
      } catch {}
    };

    loadEquippedSkin();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const previousBody = document.body.style.background;
    const previousHtml = document.documentElement.style.background;
    document.body.style.background = palette.bg;
    document.documentElement.style.background = palette.bg;
    return () => {
      document.body.style.background = previousBody;
      document.documentElement.style.background = previousHtml;
    };
  }, [palette.bg]);

  return (
    <main
      className="game-shell"
      data-game-theme={theme}
      style={{
        "--skin-accent": palette.accent,
        "--skin-bg": palette.bg,
        "--skin-pattern": palette.pattern,
        "--skin-shadow": palette.shadow,
      } as React.CSSProperties}
    >
      <div className="skin-page-pattern" aria-hidden="true" />
      <div className="skin-page-glow" aria-hidden="true" />

      <div className="game-content">
        <header className="skin-header">
          <div className="skin-header-icon" aria-hidden="true">🎲</div>
          <div className="skin-header-copy">
            <div className="skin-title">BOT VS HUMAN</div>
            <div className="skin-subtitle">Equipped board skin · ready to play</div>
          </div>
          <div className="live-pill"><span /> LIVE</div>
        </header>

        <div className="live-match"><span /> LIVE MATCH</div>

        <section className="board-host" aria-label="Ludo game">
          <GameBoardContent themeOverride={theme} />
        </section>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { min-height: 100%; margin: 0; }
        body { overflow-x: hidden; }
        .game-shell {
          position: relative;
          width: 100%;
          min-height: 100dvh;
          color: #fff;
          overflow-x: hidden;
          isolation: isolate;
          background: var(--skin-bg);
          transition: background .35s ease;
        }
        .skin-page-pattern {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: var(--skin-pattern);
          background-size: 520px 520px;
          background-repeat: repeat;
          opacity: .34;
        }
        .skin-page-glow {
          position: fixed;
          left: 50%;
          top: -160px;
          width: min(900px, 170vw);
          height: 440px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: var(--skin-accent);
          opacity: .24;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
        }
        .game-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 720px;
          min-height: 100dvh;
          margin: 0 auto;
          padding: 12px 24px 32px;
        }
        .skin-header {
          width: 100%;
          min-height: 112px;
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 18px 20px;
          border: 1px solid color-mix(in srgb, var(--skin-accent) 55%, white 45%);
          border-radius: 28px;
          background: color-mix(in srgb, var(--skin-bg) 62%, white 38%);
          box-shadow: var(--skin-shadow), 0 18px 40px rgba(0,0,0,.14);
          backdrop-filter: blur(18px);
          color: #142238;
        }
        .skin-header-icon {
          width: 68px;
          height: 68px;
          flex: 0 0 68px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          border: 2px solid color-mix(in srgb, var(--skin-accent) 65%, #26384d 35%);
          background: rgba(255,255,255,.48);
          font-size: 38px;
          box-shadow: inset 0 2px 10px rgba(255,255,255,.5);
        }
        .skin-header-copy { min-width: 0; flex: 1; }
        .skin-title { font-size: 16px; font-weight: 900; letter-spacing: 3px; color: color-mix(in srgb, var(--skin-accent) 48%, #6f8097 52%); }
        .skin-subtitle { margin-top: 14px; font-size: 15px; color: #9aabc0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .live-pill { display: flex; align-items: center; gap: 9px; padding: 12px 17px; border-radius: 999px; border: 1px solid #8a8f97; background: rgba(255,255,255,.38); font-weight: 900; letter-spacing: 1px; color: #707780; }
        .live-pill span, .live-match span { width: 12px; height: 12px; display: inline-block; border-radius: 50%; background: #ff3156; box-shadow: 0 0 14px rgba(255,49,86,.35); }
        .live-match { display: flex; justify-content: center; align-items: center; gap: 10px; margin: 18px 0 16px; font-weight: 900; letter-spacing: 4px; font-size: 15px; color: rgba(255,255,255,.84); text-shadow: 0 2px 12px rgba(0,0,0,.25); }
        .board-host { position: relative; z-index: 1; width: 100%; }
        .board-host section { width: 100%; }
        .board-host section[aria-label="Dice and turn controls"] { margin-top: 14px !important; }
        @media (max-width: 560px) {
          .game-content { padding: 10px 12px 28px; }
          .skin-header { min-height: 104px; padding: 14px; gap: 12px; border-radius: 24px; }
          .skin-header-icon { width: 60px; height: 60px; flex-basis: 60px; font-size: 32px; border-radius: 18px; }
          .skin-title { font-size: 13px; letter-spacing: 2.5px; }
          .skin-subtitle { margin-top: 10px; font-size: 13px; }
          .live-pill { padding: 10px 12px; font-size: 12px; }
          .live-pill span { width: 10px; height: 10px; }
          .live-match { margin: 16px 0 14px; font-size: 13px; letter-spacing: 3px; }
        }
      `}</style>
    </main>
  );
}
