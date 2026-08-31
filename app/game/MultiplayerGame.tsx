"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

/**
 * Multiplayer route shell.
 * The multiplayer route is deliberately board-first: the live board and its
 * playable dice remain, while secondary HUD/chat/voice chrome is hidden.
 */
export default function MultiplayerGame() {
  return (
    <div className="clean-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        html,
        body {
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
          height: 100dvh !important;
          min-height: 100dvh !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #050505 !important;
        }

        .clean-multiplayer-route .live-page {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          overflow: hidden !important;
          background: #050505 !important;
        }

        .clean-multiplayer-route .board-stage {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;
          display: grid !important;
          place-items: center !important;
          padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)) !important;
          overflow: hidden !important;
        }

        /* One sizing authority: the board is always a square and fits both
           viewport dimensions. This avoids mobile browser vh/svh conflicts. */
        .clean-multiplayer-route .board-wrap {
          width: min(calc(100vw - 16px), calc(100dvh - 16px), 760px) !important;
          height: min(calc(100vw - 16px), calc(100dvh - 16px), 760px) !important;
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

        /* Remove page chrome. */
        .clean-multiplayer-route .match-badge,
        .clean-multiplayer-route .turn-pill,
        .clean-multiplayer-route .board-glow,
        .clean-multiplayer-route .chat-tool,
        .clean-multiplayer-route .mic-tool,
        .clean-multiplayer-route .chat-panel {
          display: none !important;
        }

        /* Keep only the playable dice control, directly attached to the board. */
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
          bottom: max(10px, env(safe-area-inset-bottom)) !important;
          transform: translateX(-50%) !important;
          pointer-events: auto !important;
          z-index: 60 !important;
        }

        @media (orientation: landscape) and (max-height: 520px) {
          .clean-multiplayer-route .board-wrap {
            width: min(calc(100vw - 12px), calc(100dvh - 12px), 620px) !important;
            height: min(calc(100vw - 12px), calc(100dvh - 12px), 620px) !important;
          }
        }
      `}</style>
    </div>
  );
}
