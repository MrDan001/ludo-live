"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

/** Board-first multiplayer route. */
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

        .clean-multiplayer-route,
        .clean-multiplayer-route .live-page {
          position: fixed !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #050505 !important;
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

        /* The board gets the largest safe square available. Use viewport
           dimensions directly instead of mixing svh/dvh, which varies between
           mobile browser chrome states. */
        .clean-multiplayer-route .board-wrap {
          width: min(100vw, 100vh, 760px) !important;
          height: min(100vw, 100vh, 760px) !important;
          max-width: 760px !important;
          max-height: 760px !important;
          min-width: 0 !important;
          min-height: 0 !important;
          aspect-ratio: 1 / 1 !important;
          flex: none !important;
        }

        .clean-multiplayer-route .board-frame {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          padding: 3px !important;
          border-radius: 18px !important;
          background: #151515 !important;
          box-shadow: 0 12px 35px rgba(0,0,0,.45) !important;
        }

        .clean-multiplayer-route .board-frame > div {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          aspect-ratio: 1 / 1 !important;
          border-radius: 15px !important;
          overflow: hidden !important;
        }

        /* Only the board and playable dice remain visible. */
        .clean-multiplayer-route .match-badge,
        .clean-multiplayer-route .turn-pill,
        .clean-multiplayer-route .board-glow,
        .clean-multiplayer-route .chat-tool,
        .clean-multiplayer-route .mic-tool,
        .clean-multiplayer-route .chat-panel {
          display: none !important;
        }

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

        /* On very short landscape screens, reserve a small amount for the
           browser-safe edge while still maximizing board size. */
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
