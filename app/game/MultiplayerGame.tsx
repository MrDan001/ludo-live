"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="premium-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        /* MULTIPLAYER PAGE ONLY.
           Keep the rest of the application untouched. The board is sized from the
           mobile viewport width so every phone gets the same responsive scale. */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: #000 !important;
          overflow: hidden !important;
        }

        *, *::before, *::after { box-sizing: border-box; }

        .premium-multiplayer-route,
        .premium-multiplayer-route .pg-game {
          position: fixed !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #000 !important;
          overflow: hidden !important;
        }

        .premium-multiplayer-route .pg-shell {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
        }

        /* Multiplayer HUD is hidden on this board-only route and cannot constrain it. */
        .premium-multiplayer-route .pg-shell > .pg-header,
        .premium-multiplayer-route .pg-shell > .pg-bottom,
        .premium-multiplayer-route .pg-shell > .pg-reaction-row,
        .premium-multiplayer-route .pg-shell > .pg-utility-row,
        .premium-multiplayer-route .pg-shell > .lux-modal-bg,
        .premium-multiplayer-route .pg-header,
        .premium-multiplayer-route .pg-bottom,
        .premium-multiplayer-route .pg-reaction-row,
        .premium-multiplayer-route .pg-utility-row,
        .premium-multiplayer-route .lux-modal-bg {
          display: none !important;
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
          min-height: 0 !important;
          max-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        .premium-multiplayer-route .lux-board-zone {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: visible !important;
        }

        /*
          RESPONSIVE MULTIPLAYER BOARD:
          - Width is the source of truth on portrait phones.
          - Height follows width exactly, preserving the square board.
          - 94vw leaves a small breathing margin instead of allowing another
            device's height/layout rules to make the board tiny.
          - 760px caps very large screens without affecting normal phones.
        */
        .premium-multiplayer-route .pg-board-frame {
          position: relative !important;
          width: min(94vw, 760px) !important;
          height: min(94vw, 760px) !important;
          max-width: 760px !important;
          max-height: 760px !important;
          min-width: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          flex: 0 0 auto !important;
          flex-shrink: 0 !important;
          aspect-ratio: 1 / 1 !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
          transform: none !important;
        }

        .premium-multiplayer-route .pg-board-frame > div {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: none !important;
          max-height: none !important;
          aspect-ratio: 1 / 1 !important;
          margin: 0 !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }

        /* Explicit mobile override: never let a phone-specific inherited rule
           shrink the multiplayer board below the viewport-width calculation. */
        @media (max-width: 900px) {
          .premium-multiplayer-route .pg-board-frame {
            width: calc(100vw - 12px) !important;
            height: calc(100vw - 12px) !important;
            max-width: calc(100vw - 12px) !important;
            max-height: calc(100vw - 12px) !important;
            flex: 0 0 calc(100vw - 12px) !important;
          }
        }
      `}</style>
    </div>
  );
}
