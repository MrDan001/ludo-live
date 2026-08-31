"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

/**
 * Multiplayer route shell.
 *
 * This route intentionally contains only the live Ludo board and the minimum
 * control needed to play it (the dice). Match chat, voice controls, badges,
 * turn/status pills and decorative page chrome are hidden here only.
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

        .clean-multiplayer-route,
        .clean-multiplayer-route .live-page,
        .clean-multiplayer-route .board-stage {
          position: fixed !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        /* The multiplayer route is intentionally board-only. */
        .clean-multiplayer-route .match-badge,
        .clean-multiplayer-route .turn-pill,
        .clean-multiplayer-route .chat-panel,
        .clean-multiplayer-route .chat-tool,
        .clean-multiplayer-route .mic-tool {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        .clean-multiplayer-route .board-stage {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #050505 !important;
        }

        .clean-multiplayer-route .board-wrap {
          position: relative !important;
          width: min(96vw, 96svh, 760px) !important;
          height: min(96vw, 96svh, 760px) !important;
          max-width: 760px !important;
          max-height: 760px !important;
          min-width: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          aspect-ratio: 1 / 1 !important;
        }

        .clean-multiplayer-route .board-glow {
          display: none !important;
        }

        /* Remove the old decorative gold container. The board itself is the UI. */
        .clean-multiplayer-route .board-frame {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .clean-multiplayer-route .board-frame > div {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          margin: 0 !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }

        /* Keep the playable dice, but make it a compact board control rather
           than another page-level panel. */
        .clean-multiplayer-route .floating-tools {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          pointer-events: none !important;
        }

        .clean-multiplayer-route .dice-float {
          position: absolute !important;
          left: 50% !important;
          bottom: 3% !important;
          transform: translateX(-50%) !important;
          z-index: 100 !important;
          pointer-events: auto !important;
        }

        .clean-multiplayer-route .dice-float > * {
          max-width: 64px !important;
          max-height: 64px !important;
        }

        @media (max-width: 600px) {
          .clean-multiplayer-route .board-wrap {
            width: min(100vw, 100svh) !important;
            height: min(100vw, 100svh) !important;
          }

          .clean-multiplayer-route .dice-float {
            bottom: 2.5% !important;
          }
        }

        @media (max-height: 620px) and (orientation: landscape) {
          .clean-multiplayer-route .board-wrap {
            width: min(100svh, 100vw) !important;
            height: min(100svh, 100vw) !important;
          }
        }
      `}</style>
    </div>
  );
}
