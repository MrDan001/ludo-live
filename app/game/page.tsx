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
          // Do not return here — localStorage may be stale (e.g. left over
          // from a previous match or an old equipped skin). Always confirm
          // against the live customization API below, same as LudoBoardGame does.
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
        background: palette.bg,
      } as React.CSSProperties}
    >
      <div className="skinPagePattern" aria-hidden="true" />
      <div className="skinPageGlow" aria-hidden="true" />

      <div className="gameContent">
        <section className="boardHost" aria-label="Ludo game">
          <GameBoardContent themeOverride={theme} />
        </section>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { min-height: 100%; }
        .game-shell {
          position: relative;
          width: 100%;
          min-height: 100dvh;
          min-height: 100svh;
          color: #fff;
          overflow-x: hidden;
          isolation: isolate;
          transition: background .35s ease;
        }
        .skinPagePattern {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: var(--skin-pattern);
          background-size: 520px 520px;
          background-repeat: repeat;
          opacity: .3;
        }
        .skinPageGlow {
          position: absolute;
          left: 50%;
          top: -180px;
          width: min(900px, 160vw);
          height: 420px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: var(--skin-accent);
          opacity: .2;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }
        .gameContent {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 620px;
          min-height: 100dvh;
          margin: 0 auto;
          padding: 10px 10px 28px;
        }
        .boardHost {
          position: relative;
          z-index: 1;
          width: 100%;
        }
        .boardHost > section {
          width: 100%;
        }
        .boardHost section[aria-label="Dice and turn controls"] {
          margin-top: 12px !important;
          border-radius: 24px !important;
          border-color: color-mix(in srgb, var(--skin-accent) 70%, white 10%) !important;
          background: color-mix(in srgb, var(--skin-bg) 78%, #061426 22%) !important;
          box-shadow: var(--skin-shadow), 0 14px 34px color-mix(in srgb, var(--skin-accent) 18%, transparent) !important;
        }
        .boardHost section[aria-label="Dice and turn controls"] p {
          color: color-mix(in srgb, var(--skin-accent) 25%, white 75%) !important;
        }
        @media (max-width: 430px) {
          .gameContent { padding: 8px 7px 22px; }
        }
      `}</style>
    </main>
  );
}
