"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="multiplayer-route-shell">
      <div className="multiplayer-fresh-header" aria-label="Multiplayer match header">
        <div className="multiplayer-fresh-player multiplayer-fresh-player-left">
          <div className="multiplayer-fresh-avatar">👑</div>
          <div className="multiplayer-fresh-player-copy">
            <strong>Bambiii</strong>
            <span>★ 24 · <i /> YOUR TURN</span>
          </div>
        </div>

        <div className="multiplayer-fresh-vs">VS</div>

        <div className="multiplayer-fresh-player multiplayer-fresh-player-right">
          <div className="multiplayer-fresh-player-copy">
            <strong>Adaugo</strong>
            <span><i /> IN MATCH · ★ 18</span>
          </div>
          <div className="multiplayer-fresh-avatar">🎮</div>
        </div>
      </div>

      <div className="multiplayer-game-layer">
        <MultiplayerGameCanonical />
      </div>

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
          height: 100dvh !important;
          overflow: hidden !important;
          background: #030303 !important;
        }

        /* The canonical component still contains its historical header.
           Keep that legacy layer completely out of the render surface. */
        .multiplayer-route-shell .ll-header,
        .multiplayer-route-shell .ll-brand,
        .multiplayer-route-shell .ll-menu-btn,
        .multiplayer-route-shell .skin-header,
        .multiplayer-route-shell .live-pill,
        .multiplayer-route-shell .live-match {
          display: none !important;
        }

        .multiplayer-fresh-header {
          position: absolute !important;
          z-index: 1000 !important;
          top: 0 !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: min(760px, 100vw) !important;
          min-height: 92px !important;
          padding: 12px 18px !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1fr) !important;
          align-items: center !important;
          gap: 10px !important;
          background: rgba(3, 3, 3, 0.98) !important;
          border-bottom: 1px solid rgba(212, 175, 55, 0.42) !important;
          box-shadow: 0 12px 30px rgba(0,0,0,.55) !important;
          isolation: isolate !important;
        }

        .multiplayer-fresh-player {
          min-width: 0 !important;
          min-height: 66px !important;
          display: flex !important;
          align-items: center !important;
          gap: 9px !important;
          padding: 8px 10px !important;
          border: 1px solid rgba(212,175,55,.52) !important;
          border-radius: 19px !important;
          background: linear-gradient(145deg, rgba(24,19,9,.96), rgba(5,5,4,.99)) !important;
        }

        .multiplayer-fresh-player-right {
          justify-content: flex-end !important;
          text-align: right !important;
        }

        .multiplayer-fresh-avatar {
          width: 45px !important;
          height: 45px !important;
          flex: 0 0 45px !important;
          display: grid !important;
          place-items: center !important;
          border-radius: 50% !important;
          border: 1.5px solid #d4af37 !important;
          background: #18140c !important;
          font-size: 21px !important;
        }

        .multiplayer-fresh-player-copy {
          min-width: 0 !important;
          overflow: hidden !important;
        }

        .multiplayer-fresh-player-copy strong {
          display: block !important;
          color: #fff !important;
          font-size: 15px !important;
          line-height: 1.15 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .multiplayer-fresh-player-copy span {
          display: block !important;
          margin-top: 5px !important;
          color: #aaa !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          white-space: nowrap !important;
        }

        .multiplayer-fresh-player-copy i {
          display: inline-block !important;
          width: 7px !important;
          height: 7px !important;
          margin-right: 3px !important;
          border-radius: 50% !important;
          background: #4ade80 !important;
          box-shadow: 0 0 7px #4ade80 !important;
        }

        .multiplayer-fresh-player-right .multiplayer-fresh-player-copy i {
          background: #ef4444 !important;
          box-shadow: 0 0 7px #ef4444 !important;
        }

        .multiplayer-fresh-vs {
          display: grid !important;
          place-items: center !important;
          color: #d4af37 !important;
          font-size: 12px !important;
          font-weight: 950 !important;
        }

        .multiplayer-game-layer {
          position: absolute !important;
          inset: 92px 0 0 !important;
          overflow: hidden !important;
        }

        .multiplayer-game-layer .ludo-live-wrapper {
          position: absolute !important;
          inset: 0 !important;
          height: 100% !important;
        }

        .multiplayer-game-layer .ludo-live-container {
          height: 100% !important;
          padding-top: 0 !important;
        }

        .multiplayer-game-layer .ll-board-stage {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }

        @media (max-width: 560px) {
          .multiplayer-fresh-header {
            min-height: 78px !important;
            padding: 8px 9px !important;
            grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr) !important;
            gap: 5px !important;
          }

          .multiplayer-fresh-player {
            min-height: 58px !important;
            padding: 6px !important;
            border-radius: 15px !important;
            gap: 6px !important;
          }

          .multiplayer-fresh-avatar {
            width: 38px !important;
            height: 38px !important;
            flex-basis: 38px !important;
            font-size: 18px !important;
          }

          .multiplayer-fresh-player-copy strong { font-size: 13px !important; }
          .multiplayer-fresh-player-copy span { font-size: 8px !important; margin-top: 3px !important; }
          .multiplayer-game-layer { inset: 78px 0 0 !important; }
        }
      `}</style>
    </div>
  );
}
