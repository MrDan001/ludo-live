"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="premium-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        /* Multiplayer page: board only. Gameplay/board logic remains in the canonical component. */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #000 !important;
          overflow: hidden !important;
        }
        *, *::before, *::after { box-sizing: border-box; }

        .pg-game {
          position: fixed !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100dvh !important;
          overflow: hidden !important;
          background: #000 !important;
        }

        .pg-shell {
          width: 100% !important;
          height: 100dvh !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
        }

        /* Everything except the actual multiplayer board is removed from the page UI. */
        .pg-header,
        .pg-bottom,
        .pg-reaction-row,
        .pg-utility-row,
        .lux-modal-bg {
          display: none !important;
        }

        .lux-board-zone {
          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          padding: 0 !important;
        }

        .pg-board-frame {
          width: min(100vw, 100dvh) !important;
          max-width: 100vw !important;
          height: auto !important;
          aspect-ratio: 1 / 1 !important;
          flex: 0 0 auto !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
        }

        .pg-board-frame > div {
          width: 100% !important;
          height: 100% !important;
          aspect-ratio: 1 / 1 !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
}
