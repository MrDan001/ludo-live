"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="premium-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        html, body { margin: 0 !important; padding: 0 !important; background: #000 !important; overflow: hidden !important; }
        *, *::before, *::after { box-sizing: border-box; }

        /* UI-only responsive shell. Board and game engine remain untouched. */
        .pg-game { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100dvh !important; overflow: hidden !important; background: #000 !important; }
        .pg-shell {
          width: min(680px, calc(100vw - 20px)) !important;
          height: 100dvh !important;
          margin: 0 auto !important;
          padding: clamp(12px, 7vh, 72px) 0 max(12px, env(safe-area-inset-bottom)) !important;
          display: grid !important;
          grid-template-rows: auto minmax(0, 1fr) auto auto auto !important;
          gap: 8px !important;
          overflow: hidden !important;
        }

        .pg-header {
          position: relative !important;
          min-height: 84px !important;
          height: 84px !important;
          padding: 5px 8px !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 96px minmax(0, 1fr) !important;
          gap: 8px !important;
          align-items: center !important;
          overflow: visible !important;
        }
        .pg-player:nth-child(1) { grid-column: 1 !important; grid-row: 1 !important; }
        .pg-player:nth-child(2) { grid-column: 3 !important; grid-row: 1 !important; }
        .pg-player { min-width: 0 !important; height: 68px !important; padding: 4px 8px !important; gap: 6px !important; overflow: hidden !important; }
        .pg-avatar-btn { width: 38px !important; height: 38px !important; flex: 0 0 38px !important; padding: 0 !important; border: 0 !important; background: transparent !important; }
        .pg-avatar { width: 38px !important; height: 38px !important; overflow: hidden !important; }
        .pg-avatar > span { width: 100% !important; height: 100% !important; }
        .pg-player-copy { min-width: 0 !important; overflow: hidden !important; }
        .pg-player-copy b { font-size: 11px !important; line-height: 1.1 !important; max-width: 100% !important; }
        .pg-player-copy small { font-size: 7px !important; line-height: 1.15 !important; }
        .pg-star { font-size: 9px !important; margin-left: 2px !important; }
        .pg-crown { font-size: 11px !important; }
        .pg-logo { grid-column: 2 !important; grid-row: 1 !important; position: relative !important; left: auto !important; top: auto !important; transform: none !important; justify-self: center !important; width: 78px !important; height: 78px !important; z-index: 5 !important; }
        .pg-menu { display: none !important; }

        .lux-board-zone { min-height: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; overflow: hidden !important; }
        .pg-board-frame { width: min(calc(100vw - 20px), calc(100dvh - 350px), 656px) !important; max-width: 100% !important; height: auto !important; aspect-ratio: 1 / 1 !important; flex: 0 1 auto !important; padding: 4px !important; border-radius: 26px !important; }
        .pg-board-frame > div { width: 100% !important; height: 100% !important; aspect-ratio: 1 / 1 !important; }

        .pg-bottom { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1.84fr) minmax(84px, .45fr) !important; gap: 7px !important; height: 160px !important; min-height: 160px !important; }
        .pg-profile-card, .pg-turn-card { height: 160px !important; min-height: 160px !important; overflow: hidden !important; }
        .pg-profile-card { padding: 9px !important; display: grid !important; grid-template-columns: 58px minmax(0, 1fr) !important; grid-template-rows: 54px 1fr 30px !important; column-gap: 8px !important; align-items: center !important; }
        .pg-profile-avatar { grid-column: 1 !important; grid-row: 1 / span 2 !important; width: 44px !important; height: 44px !important; margin: 0 !important; align-self: start !important; }
        .pg-profile-avatar > span { width: 100% !important; height: 100% !important; }
        .pg-profile-card strong { grid-column: 2 !important; grid-row: 1 !important; font-size: 14px !important; }
        .pg-stars { grid-column: 2 !important; grid-row: 1 !important; font-size: 11px !important; }
        .pg-edit { grid-column: 2 !important; grid-row: 1 !important; }
        .pg-coin-row { grid-column: 1 / -1 !important; grid-row: 3 !important; width: 100% !important; height: 30px !important; margin: 0 !important; padding: 5px 9px !important; font-size: 11px !important; }
        .pg-coin-row a { display: none !important; }

        .pg-turn-card { position: relative !important; padding: 12px !important; display: block !important; }
        .pg-turn-title { max-width: 50% !important; font-size: 16px !important; line-height: 1.05 !important; }
        .pg-turn-card p { max-width: 48% !important; margin: 6px 0 0 !important; font-size: 10px !important; line-height: 1.2 !important; }
        .pg-dice { right: 4px !important; top: 53% !important; bottom: auto !important; transform: translateY(-50%) scale(.70) !important; transform-origin: center right !important; margin: 0 !important; }
        .pg-comm-actions { height: 160px !important; gap: 7px !important; }
        .pg-comm-actions > button, .pg-voice button { min-height: 76px !important; border-radius: 17px !important; }
        .pg-comm-actions > button span { font-size: 20px !important; }
        .pg-comm-actions b { font-size: 9px !important; }
        .pg-voice { height: 76px !important; }

        .pg-reaction-row { height: 44px !important; min-height: 44px !important; display: flex !important; flex-wrap: nowrap !important; gap: 6px !important; overflow: hidden !important; }
        .pg-reaction-row button { min-width: 0 !important; padding: 6px 4px !important; font-size: 10px !important; white-space: nowrap !important; }
        .pg-utility-row { height: 46px !important; min-height: 46px !important; display: flex !important; gap: 6px !important; }
        .pg-utility-row button { min-height: 42px !important; font-size: 10px !important; }
        .pg-room { flex: 1.5 !important; }
        .lux-modal-bg { z-index: 100 !important; }

        @media (max-width: 700px) {
          .pg-shell { width: calc(100vw - 16px) !important; padding-top: clamp(10px, 5vh, 52px) !important; gap: 7px !important; }
          .pg-header { grid-template-columns: minmax(0, 1fr) 82px minmax(0, 1fr) !important; gap: 6px !important; height: 82px !important; min-height: 82px !important; padding: 4px 6px !important; }
          .pg-logo { width: 68px !important; height: 68px !important; }
          .pg-player { height: 64px !important; padding: 4px 6px !important; }
          .pg-avatar-btn, .pg-avatar { width: 34px !important; height: 34px !important; flex-basis: 34px !important; }
          .pg-player-copy b { font-size: 10px !important; }
          .pg-player-copy small { font-size: 7px !important; }
          .pg-star { font-size: 8px !important; }
          .pg-board-frame { width: min(calc(100vw - 16px), calc(100dvh - 330px)) !important; }
          .pg-bottom { grid-template-columns: minmax(0, 1fr) minmax(0, 1.84fr) minmax(78px, .45fr) !important; height: 160px !important; min-height: 160px !important; }
          .pg-profile-card, .pg-turn-card { height: 160px !important; min-height: 160px !important; }
          .pg-profile-card { grid-template-columns: 53px minmax(0, 1fr) !important; grid-template-rows: 50px 1fr 29px !important; padding: 8px !important; }
          .pg-profile-avatar { width: 42px !important; height: 42px !important; }
          .pg-profile-card strong { font-size: 13px !important; }
          .pg-stars { font-size: 10px !important; }
          .pg-turn-title { font-size: 15px !important; }
          .pg-turn-card p { font-size: 9px !important; }
          .pg-dice { transform: translateY(-50%) scale(.66) !important; }
          .pg-comm-actions > button span { font-size: 18px !important; }
          .pg-reaction-row button { font-size: 9px !important; padding: 6px 3px !important; }
          .pg-utility-row button { font-size: 9px !important; min-height: 40px !important; }
          .pg-room { font-size: 8px !important; }
        }

        @media (max-width: 520px) {
          .pg-shell { width: calc(100vw - 12px) !important; padding-top: 8px !important; }
          .pg-header { grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr) !important; height: 78px !important; min-height: 78px !important; }
          .pg-logo { width: 60px !important; height: 60px !important; }
          .pg-player { height: 60px !important; }
          .pg-avatar-btn, .pg-avatar { width: 32px !important; height: 32px !important; flex-basis: 32px !important; }
          .pg-player-copy b { font-size: 9px !important; }
          .pg-player-copy small { font-size: 6px !important; }
          .pg-bottom { grid-template-columns: minmax(0, 1fr) minmax(0, 1.84fr) minmax(72px, .45fr) !important; height: 148px !important; min-height: 148px !important; }
          .pg-profile-card, .pg-turn-card { height: 148px !important; min-height: 148px !important; }
          .pg-profile-card { grid-template-columns: 49px minmax(0, 1fr) !important; grid-template-rows: 45px 1fr 27px !important; }
          .pg-profile-avatar { width: 38px !important; height: 38px !important; }
          .pg-profile-card strong { font-size: 12px !important; }
          .pg-stars { font-size: 9px !important; }
          .pg-coin-row { height: 27px !important; font-size: 10px !important; }
          .pg-turn-title { font-size: 14px !important; }
          .pg-turn-card p { font-size: 8px !important; }
          .pg-dice { transform: translateY(-50%) scale(.60) !important; }
          .pg-comm-actions { height: 148px !important; }
          .pg-comm-actions > button, .pg-voice button { min-height: 70px !important; }
          .pg-reaction-row { height: 42px !important; min-height: 42px !important; }
          .pg-reaction-row button { font-size: 8px !important; padding: 5px 2px !important; }
          .pg-utility-row { height: 42px !important; min-height: 42px !important; }
          .pg-utility-row button { font-size: 8px !important; min-height: 38px !important; }
        }

        @media (max-height: 900px) {
          .pg-shell { padding-top: 10px !important; }
          .pg-board-frame { width: min(calc(100vw - 16px), calc(100dvh - 320px)) !important; }
          .pg-bottom, .pg-profile-card, .pg-turn-card, .pg-comm-actions { height: 148px !important; min-height: 148px !important; }
          .pg-reaction-row { height: 40px !important; min-height: 40px !important; }
          .pg-utility-row { height: 42px !important; min-height: 42px !important; }
          .pg-dice { transform: translateY(-50%) scale(.58) !important; }
        }
      `}</style>
    </div>
  );
}
