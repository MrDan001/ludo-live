"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="premium-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        html, body { margin: 0 !important; padding: 0 !important; background: #000 !important; overflow: hidden !important; }
        *, *::before, *::after { box-sizing: border-box; }

        /* MULTIPLAYER PRESENTATION SHELL ONLY.
           Board, engine, socket/gameplay logic and every other game route remain untouched. */
        .pg-game { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100dvh !important; overflow: hidden !important; background: #000 !important; }
        .pg-shell {
          width: 100% !important;
          max-width: 760px !important;
          height: 100dvh !important;
          margin: 0 auto !important;
          padding: max(5px, env(safe-area-inset-top)) 0 max(6px, env(safe-area-inset-bottom)) !important;
          display: grid !important;
          grid-template-rows: 68px auto minmax(0, 1fr) auto auto !important;
          gap: 7px !important;
          overflow: hidden !important;
        }

        /* HEADER: edge-to-edge — Avatar + name | LUDO LIVE | Avatar + name */
        .pg-header {
          position: relative !important;
          width: 100% !important;
          min-height: 68px !important;
          height: 68px !important;
          padding: 3px 8px !important;
          display: grid !important;
          grid-template-columns: minmax(0,1fr) 64px minmax(0,1fr) !important;
          gap: 0 !important;
          align-items: center !important;
          overflow: visible !important;
          border-radius: 0 !important;
          border-left: 0 !important;
          border-right: 0 !important;
        }
        .pg-player:nth-child(1) { grid-column: 1 !important; grid-row: 1 !important; justify-self: start !important; }
        .pg-player:nth-child(2) { grid-column: 3 !important; grid-row: 1 !important; justify-self: end !important; flex-direction: row-reverse !important; text-align: right !important; }
        .pg-player {
          min-width: 0 !important;
          width: 100% !important;
          max-width: none !important;
          height: 58px !important;
          padding: 3px 2px !important;
          gap: 7px !important;
          overflow: hidden !important;
          border: 0 !important;
          background: transparent !important;
          border-radius: 0 !important;
        }
        .pg-avatar-btn { width: 38px !important; height: 38px !important; flex: 0 0 38px !important; padding: 0 !important; border: 0 !important; background: transparent !important; }
        .pg-avatar { width: 38px !important; height: 38px !important; overflow: hidden !important; }
        .pg-avatar > span { width: 100% !important; height: 100% !important; }
        .pg-player-copy { min-width: 0 !important; flex: 1 1 auto !important; overflow: hidden !important; }
        .pg-player-copy b { display:block !important; font-size: 11px !important; line-height: 1.1 !important; max-width: 100% !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
        .pg-player-copy small { display:block !important; font-size: 7px !important; line-height: 1.15 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
        .pg-star { font-size: 8px !important; margin: 0 2px !important; flex: 0 0 auto !important; }
        .pg-crown { font-size: 10px !important; }
        .pg-logo { grid-column: 2 !important; grid-row: 1 !important; position: relative !important; left: auto !important; top: auto !important; transform: none !important; justify-self: center !important; width: 58px !important; height: 58px !important; z-index: 5 !important; }
        .pg-logo span { font-size: 15px !important; }
        .pg-logo strong { font-size: 16px !important; }
        .pg-logo b { font-size: 10px !important; }
        .pg-menu { display: none !important; }

        /* Keep the board centered inside the same shell on every device. */
        .lux-board-zone {
          min-height: 0 !important;
          width: 100% !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: center !important;
          overflow: visible !important;
          padding-top: 9px !important;
        }
        .pg-board-frame {
          width: min(calc(100% - 24px), 620px) !important;
          max-width: 100% !important;
          height: auto !important;
          aspect-ratio: 1 / 1 !important;
          flex: 0 0 auto !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .pg-board-frame > div {
          width: 100% !important;
          height: 100% !important;
          aspect-ratio: 1 / 1 !important;
          border-radius: 0 !important;
        }

        /* HUD stays underneath the board and keeps its existing functionality. */
        .pg-bottom { display: grid !important; grid-template-columns: minmax(0,1fr) minmax(0,1.7fr) minmax(72px,.48fr) !important; gap: 6px !important; height: 126px !important; min-height: 126px !important; }
        .pg-profile-card, .pg-turn-card { height: 126px !important; min-height: 126px !important; overflow: hidden !important; }
        .pg-profile-card { padding: 8px !important; display: grid !important; grid-template-columns: 46px minmax(0,1fr) !important; grid-template-rows: 42px 1fr 24px !important; column-gap: 6px !important; align-items: center !important; }
        .pg-profile-avatar { grid-column: 1 !important; grid-row: 1 / span 2 !important; width: 36px !important; height: 36px !important; margin: 0 !important; align-self: start !important; }
        .pg-profile-avatar > span { width: 100% !important; height: 100% !important; }
        .pg-profile-card strong { grid-column: 2 !important; grid-row: 1 !important; font-size: 11px !important; }
        .pg-stars { grid-column: 2 !important; grid-row: 1 !important; font-size: 8px !important; }
        .pg-edit { grid-column: 2 !important; grid-row: 1 !important; }
        .pg-coin-row { grid-column: 1 / -1 !important; grid-row: 3 !important; width: 100% !important; height: 24px !important; margin: 0 !important; padding: 4px 7px !important; font-size: 9px !important; }
        .pg-coin-row a { display: none !important; }
        .pg-turn-card { position: relative !important; padding: 9px !important; display: block !important; }
        .pg-turn-title { max-width: 48% !important; font-size: 13px !important; line-height: 1.05 !important; }
        .pg-turn-card p { max-width: 46% !important; margin: 5px 0 0 !important; font-size: 7px !important; line-height: 1.2 !important; }
        .pg-dice { right: 2px !important; top: 52% !important; bottom: auto !important; transform: translateY(-50%) scale(.52) !important; transform-origin: center right !important; margin: 0 !important; }
        .pg-comm-actions { height: 126px !important; gap: 6px !important; }
        .pg-comm-actions > button, .pg-voice button { min-height: 60px !important; border-radius: 14px !important; }
        .pg-comm-actions > button span { font-size: 17px !important; }
        .pg-comm-actions b { font-size: 8px !important; }
        .pg-voice { height: 60px !important; }
        .pg-reaction-row { height: 35px !important; min-height: 35px !important; display: flex !important; flex-wrap: nowrap !important; gap: 5px !important; overflow: hidden !important; }
        .pg-reaction-row button { min-width: 0 !important; padding: 5px 3px !important; font-size: 8px !important; white-space: nowrap !important; }
        .pg-utility-row { height: 36px !important; min-height: 36px !important; display: flex !important; gap: 5px !important; }
        .pg-utility-row button { min-height: 36px !important; font-size: 8px !important; }
        .pg-room { flex: 1.5 !important; }
        .lux-modal-bg { z-index: 100 !important; }

        @media (max-width: 560px) {
          .pg-shell { width: 100% !important; max-width: none !important; padding-left: 0 !important; padding-right: 0 !important; grid-template-rows: 62px auto minmax(0,1fr) auto auto !important; gap: 5px !important; }
          .pg-header { grid-template-columns: minmax(0,1fr) 54px minmax(0,1fr) !important; height: 62px !important; min-height: 62px !important; padding: 2px 6px !important; }
          .pg-logo { width: 50px !important; height: 50px !important; }
          .pg-player { height: 52px !important; gap: 5px !important; padding: 2px 1px !important; }
          .pg-avatar-btn, .pg-avatar { width: 31px !important; height: 31px !important; flex-basis: 31px !important; }
          .pg-player-copy b { font-size: 9px !important; }
          .pg-player-copy small { font-size: 6px !important; }
          .pg-star { font-size: 7px !important; }
          .lux-board-zone { padding-top: 10px !important; }
          .pg-board-frame { width: min(calc(100% - 24px), 620px) !important; }
          .pg-bottom, .pg-profile-card, .pg-turn-card, .pg-comm-actions { height: 120px !important; min-height: 120px !important; }
          .pg-profile-card { grid-template-columns: 42px minmax(0,1fr) !important; grid-template-rows: 38px 1fr 23px !important; padding: 7px !important; }
          .pg-profile-avatar { width: 33px !important; height: 33px !important; }
          .pg-profile-card strong { font-size: 10px !important; }
          .pg-stars { font-size: 7px !important; }
          .pg-coin-row { height: 23px !important; font-size: 8px !important; }
          .pg-turn-card { padding: 8px !important; }
          .pg-turn-title { font-size: 12px !important; }
          .pg-turn-card p { font-size: 6.5px !important; }
          .pg-dice { transform: translateY(-50%) scale(.48) !important; }
          .pg-comm-actions > button, .pg-voice button { min-height: 56px !important; }
          .pg-comm-actions > button span { font-size: 15px !important; }
          .pg-voice { height: 56px !important; }
          .pg-reaction-row { height: 33px !important; min-height: 33px !important; }
          .pg-utility-row { height: 35px !important; min-height: 35px !important; }
        }

        @media (max-width: 380px) {
          .pg-header { grid-template-columns: minmax(0,1fr) 48px minmax(0,1fr) !important; height: 56px !important; min-height: 56px !important; padding: 1px 4px !important; }
          .pg-logo { width: 44px !important; height: 44px !important; }
          .pg-player { height: 48px !important; gap: 4px !important; }
          .pg-avatar-btn, .pg-avatar { width: 27px !important; height: 27px !important; flex-basis: 27px !important; }
          .pg-player-copy b { font-size: 8px !important; }
          .pg-player-copy small { font-size: 5px !important; }
          .pg-board-frame { width: min(calc(100% - 24px), 620px) !important; }
          .lux-board-zone { padding-top: 9px !important; }
          .pg-bottom, .pg-profile-card, .pg-turn-card, .pg-comm-actions { height: 112px !important; min-height: 112px !important; }
          .pg-profile-card { grid-template-columns: 38px minmax(0,1fr) !important; grid-template-rows: 34px 1fr 21px !important; }
          .pg-profile-avatar { width: 30px !important; height: 30px !important; }
          .pg-profile-card strong { font-size: 9px !important; }
          .pg-stars { font-size: 6px !important; }
          .pg-coin-row { height: 21px !important; font-size: 7px !important; }
          .pg-turn-title { font-size: 11px !important; }
          .pg-turn-card p { font-size: 6px !important; }
          .pg-dice { transform: translateY(-50%) scale(.44) !important; }
          .pg-comm-actions > button, .pg-voice button { min-height: 52px !important; }
          .pg-comm-actions > button span { font-size: 13px !important; }
          .pg-voice { height: 52px !important; }
          .pg-reaction-row { height: 30px !important; min-height: 30px !important; }
          .pg-utility-row { height: 32px !important; min-height: 32px !important; }
        }

        /* Short phones: preserve board width; compress the HUD around it. */
        @media (max-height: 680px) {
          .pg-shell { padding-top: 2px !important; gap: 3px !important; }
          .pg-header { height: 52px !important; min-height: 52px !important; }
          .pg-logo { width: 42px !important; height: 42px !important; }
          .pg-player { height: 44px !important; }
          .lux-board-zone { padding-top: 8px !important; }
          .pg-bottom, .pg-profile-card, .pg-turn-card, .pg-comm-actions { height: 98px !important; min-height: 98px !important; }
          .pg-comm-actions > button, .pg-voice button { min-height: 45px !important; }
          .pg-voice { height: 45px !important; }
          .pg-reaction-row { height: 27px !important; min-height: 27px !important; }
          .pg-utility-row { height: 30px !important; min-height: 30px !important; }
        }
      `}</style>
    </div>
  );
}
