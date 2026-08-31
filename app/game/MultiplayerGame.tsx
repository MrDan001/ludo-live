"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="clean-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          background: #050505 !important;
        }
        .clean-multiplayer-route {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100% !important;
          overflow: hidden !important;
          background:
            radial-gradient(circle at 50% 50%, rgba(150,100,30,.10), transparent 34%),
            radial-gradient(circle at 12% 18%, rgba(255,255,255,.035), transparent 22%),
            radial-gradient(circle at 88% 82%, rgba(255,255,255,.025), transparent 24%),
            #050505 !important;
        }
        .clean-multiplayer-route::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .22;
          background-image:
            linear-gradient(45deg, transparent 48%, rgba(255,255,255,.025) 49%, transparent 51%),
            linear-gradient(-45deg, transparent 48%, rgba(255,255,255,.018) 49%, transparent 51%);
          background-size: 72px 72px;
          mask-image: radial-gradient(circle at center, black, transparent 78%);
          z-index: 0;
        }
        .clean-multiplayer-route::after {
          content: "✦     ·     ✧     ·     ✦";
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(92vw, 900px);
          text-align: center;
          font-size: clamp(18px, 3vw, 34px);
          letter-spacing: clamp(12px, 4vw, 42px);
          color: rgba(255,215,120,.16);
          pointer-events: none;
          z-index: 1;
          white-space: nowrap;
        }
        .clean-multiplayer-route .live-page {
          position: fixed !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
          background: transparent !important;
          z-index: 2 !important;
        }
        .clean-multiplayer-route .board-stage {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: grid !important;
          place-items: center !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .clean-multiplayer-route .board-wrap {
          width: min(100vw, 100vh, 760px) !important;
          height: min(100vw, 100vh, 760px) !important;
          max-width: 760px !important;
          max-height: 760px !important;
          min-width: 0 !important;
          min-height: 0 !important;
          aspect-ratio: 1 / 1 !important;
          flex: none !important;
          z-index: 3 !important;
          filter: drop-shadow(0 18px 38px rgba(0,0,0,.55));
        }
        .clean-multiplayer-route .board-frame {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
        }
        .clean-multiplayer-route .board-frame > div {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          aspect-ratio: 1 / 1 !important;
          overflow: hidden !important;
        }
        .clean-multiplayer-route .match-badge,
        .clean-multiplayer-route .turn-pill,
        .clean-multiplayer-route .board-glow,
        .clean-multiplayer-route .chat-tool,
        .clean-multiplayer-route .mic-tool,
        .clean-multiplayer-route .chat-panel { display: none !important; }
        .clean-multiplayer-route .floating-tools {
          position: absolute !important;
          inset: auto 0 0 0 !important;
          width: 100% !important;
          height: 0 !important;
          pointer-events: none !important;
          z-index: 50 !important;
        }
        .clean-multiplayer-route .dice-float {
          position: absolute !important;
          left: 50% !important;
          bottom: 8px !important;
          transform: translateX(-50%) !important;
          pointer-events: auto !important;
          z-index: 60 !important;
        }
        @media (max-aspect-ratio: 1/1) {
          .clean-multiplayer-route::after { top: 10%; }
        }
        @media (orientation: landscape) and (max-height: 520px) {
          .clean-multiplayer-route .board-wrap {
            width: min(100vw, calc(100vh - 8px), 620px) !important;
            height: min(100vw, calc(100vh - 8px), 620px) !important;
          }
        }
      `}</style>
    </div>
  );
}
