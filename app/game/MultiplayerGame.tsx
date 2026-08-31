"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

/** Multiplayer route shell. The board owns its gameplay; this wrapper only
 * provides stable, device-independent viewport sizing. */
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
          width: 100vw !important;
          height: 100% !important;
          min-height: 0 !important;
          overflow: hidden !important;
          background: transparent !important;
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

        /* IMPORTANT: never reserve arbitrary pixels for the HUD. That was
           what caused the board to become tiny on short devices. The HUD is
           an overlay, so the board uses the real viewport dimensions. */
        .clean-multiplayer-route .board-wrap {
          width: min(96vw, 96vh, 760px) !important;
          height: min(96vw, 96vh, 760px) !important;
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
        }

        .clean-multiplayer-route .board-frame > div {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          aspect-ratio: 1 / 1 !important;
          overflow: hidden !important;
        }

        /* Keep the old canonical floating controls hidden here; the dedicated
           multiplayer HUD can sit above the board without affecting its size. */
        .clean-multiplayer-route .floating-tools { display: none !important; }

        @media (orientation: landscape) and (max-height: 520px) {
          .clean-multiplayer-route .board-wrap {
            width: min(96vw, calc(100vh - 12px), 620px) !important;
            height: min(96vw, calc(100vh - 12px), 620px) !important;
          }
        }
      `}</style>
    </div>
  );
}
