"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="multiplayer-route-shell">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          background: #030303 !important;
        }
        .multiplayer-route-shell {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          overflow: hidden !important;
        }

        /* Multiplayer has no page header. Remove every legacy header layer
           and collapse its reserved space without touching game controls. */
        .multiplayer-route-shell .ll-header,
        .multiplayer-route-shell .ll-brand,
        .multiplayer-route-shell .ll-menu-btn,
        .multiplayer-route-shell .skin-header,
        .multiplayer-route-shell .live-pill,
        .multiplayer-route-shell .live-match {
          display: none !important;
        }

        .multiplayer-route-shell .ludo-live-container {
          padding-top: 0 !important;
        }

        .multiplayer-route-shell .ll-board-stage {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
      `}</style>
    </div>
  );
}
