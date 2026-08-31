"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="premium-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        /* CANONICAL MULTIPLAYER BOARD PAGE ONLY.
           The game component stays mounted for multiplayer state/input; this route exposes only the board. */
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

        /* Board-only canvas. */
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

        /* Nothing from the old HUD/header is allowed to affect board layout. */
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
          IMPORTANT: size from WIDTH only.
          Do not use viewport height to scale the board: phones have very different
          aspect ratios, and height-based sizing was what made one player's board tiny.
          The board therefore has the same width-driven scale rule on every phone.
        */
        .premium-multiplayer-route .pg-board-frame {
          position: relative !important;
          width: min(96vw, 760px) !important;
          height: min(96vw, 760px) !important;
          max-width: none !important;
          max-height: none !important;
          min-width: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          flex: 0 0 auto !important;
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
      `}</style>
    </div>
  );
}
