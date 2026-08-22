"use client";

import { useEffect, useState } from "react";
import BoardPage from "../board/page";
import { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId } from "../_components/LudoBoardGame";

const skinIcons: Record<string, string> = {
  classic: "🎲", golden: "👑", neon: "⚡", beach: "🏖️", galaxy: "🌌", wood: "🪵",
  dragon: "🐉", christmas: "🎄", football: "⚽", candy: "🍬", marble: "💎", nature: "🌿",
  space: "🚀", crystal: "❄️", fireice: "🔥", jungle: "🌴", love: "💖", night: "🌃", arabian: "🕌",
};

const resolveTheme = (value: unknown): BoardThemeId => {
  const id = String(value || "");
  if (id === "midnight-live") return "night";
  return id in BOARD_PALETTES ? (id as BoardThemeId) : "classic";
};

export default function GamePage() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const skinName = BOARD_NAMES[theme] || "Classic Ludo";
  const icon = skinIcons[theme] || "🎲";

  useEffect(() => {
    let active = true;

    const loadEquippedSkin = async () => {
      // Match the board's existing equipped-skin source: the equipped board
      // stored by the customization flow is used first. The API is fallback.
      try {
        const saved = localStorage.getItem("ludo-match-board");
        if (saved && (saved === "midnight-live" || saved in BOARD_PALETTES)) {
          if (active) setTheme(resolveTheme(saved));
          return;
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

  // Make the selected skin the page background too. This covers the document
  // area outside the centered game shell without changing global game logic.
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
        <header className="skinHeader">
          <a href="/mood" className="backButton" aria-label="Back to game mode">← Back</a>
          <div className="skinIdentity">
            <div className="skinIcon" aria-hidden="true">{icon}</div>
            <div className="skinCopy">
              <div className="eyebrow">BOT VS HUMAN</div>
              <h1>{skinName}</h1>
              <p>Equipped skin · ready to play</p>
            </div>
          </div>
          <div className="liveBadge"><span /> LIVE</div>
        </header>

        <div className="skinRibbon" aria-hidden="true">
          <span />
          <b>{skinName.toUpperCase()} · LIVE MATCH</b>
          <span />
        </div>

        <section className="boardHost" aria-label={`${skinName} Bot versus Human game`}>
          <BoardPage />
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
          opacity: .22;
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
          opacity: .18;
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
        .skinHeader {
          position: relative;
          min-height: 116px;
          padding: 16px 14px 15px;
          border: 1px solid color-mix(in srgb, var(--skin-accent) 72%, white 8%);
          border-radius: 24px;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--skin-bg) 82%, #000 18%), color-mix(in srgb, var(--skin-accent) 18%, #07172e 82%));
          box-shadow: var(--skin-shadow), 0 16px 42px color-mix(in srgb, var(--skin-accent) 22%, transparent);
        }
        .skinHeader::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: var(--skin-pattern);
          background-size: cover;
          opacity: .26;
          pointer-events: none;
        }
        .backButton {
          position: absolute;
          left: 12px;
          top: 10px;
          z-index: 3;
          color: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
          padding: 6px 9px;
          border-radius: 10px;
          background: rgba(0,0,0,.28);
          border: 1px solid color-mix(in srgb, var(--skin-accent) 65%, transparent);
          backdrop-filter: blur(8px);
        }
        .skinIdentity { position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; min-width: 0; width: 100%; padding-top: 18px; }
        .skinIcon { width: 62px; height: 62px; flex: 0 0 62px; display: grid; place-items: center; border-radius: 19px; font-size: 31px; background: rgba(255,255,255,.12); border: 2px solid var(--skin-accent); box-shadow: 0 0 25px color-mix(in srgb, var(--skin-accent) 35%, transparent), inset 0 0 18px rgba(255,255,255,.08); }
        .skinCopy { min-width: 0; }
        .eyebrow { color: var(--skin-accent); font-size: 9px; font-weight: 950; letter-spacing: 2.4px; }
        .skinCopy h1 { margin: 3px 0 2px; font-size: clamp(23px, 7vw, 34px); line-height: 1; font-weight: 950; letter-spacing: -.7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .skinCopy p { margin: 0; color: color-mix(in srgb, var(--skin-accent) 24%, white 76%); font-size: 11px; font-weight: 700; }
        .liveBadge { position: relative; z-index: 2; flex: 0 0 auto; align-self: flex-end; display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 999px; background: rgba(0,0,0,.34); border: 1px solid var(--skin-accent); font-size: 10px; font-weight: 950; letter-spacing: 1.1px; }
        .liveBadge span, .skinRibbon span { width: 7px; height: 7px; border-radius: 50%; display: inline-block; background: #ff3158; box-shadow: 0 0 12px #ff3158; animation: ludoLivePulse 1.35s ease-in-out infinite; }
        .skinRibbon { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 9px; margin: 10px 0 2px; color: color-mix(in srgb, var(--skin-accent) 78%, white 22%); font-size: 9px; letter-spacing: 2.2px; font-weight: 950; }
        .skinRibbon span { width: 5px; height: 5px; }
        .boardHost { position: relative; z-index: 1; width: 100%; }
        .boardHost > main > header { display: none !important; }
        .boardHost > main { min-height: auto !important; padding: 0 !important; margin: 0 !important; background: transparent !important; border-radius: 0 !important; }
        .boardHost > main .liveMatch { margin: 7px 0 12px !important; color: color-mix(in srgb, var(--skin-accent) 78%, white 22%) !important; }
        .boardHost > main section[aria-label="Dice and turn controls"] { margin-top: 12px !important; border-radius: 24px !important; border-color: color-mix(in srgb, var(--skin-accent) 70%, white 10%) !important; background: color-mix(in srgb, var(--skin-bg) 78%, #061426 22%) !important; box-shadow: var(--skin-shadow), 0 14px 34px color-mix(in srgb, var(--skin-accent) 18%, transparent) !important; }
        .boardHost > main section[aria-label="Dice and turn controls"] p { color: color-mix(in srgb, var(--skin-accent) 25%, white 75%) !important; }
        @keyframes ludoLivePulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(.72); opacity: .42; } }
        @media (max-width: 430px) {
          .gameContent { padding: 8px 7px 22px; }
          .skinHeader { min-height: 108px; border-radius: 21px; padding-left: 10px; }
          .skinIcon { width: 54px; height: 54px; flex-basis: 54px; font-size: 27px; border-radius: 16px; }
          .skinCopy h1 { font-size: 22px; }
          .skinCopy p { font-size: 10px; }
          .liveBadge { padding: 6px 8px; font-size: 9px; }
        }
      `}</style>
    </main>
  );
}
