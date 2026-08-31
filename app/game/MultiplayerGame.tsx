"use client";

import MultiplayerGameCanonical from "./MultiplayerGameCanonical";

export default function MultiplayerGame() {
  return (
    <div className="premium-multiplayer-route">
      <MultiplayerGameCanonical />
      <style jsx global>{`
        html, body { margin: 0 !important; padding: 0 !important; background: #000 !important; overflow: hidden !important; }
        *, *::before, *::after { box-sizing: border-box; }

        /* Multiplayer presentation shell only. Canonical board + engine are untouched. */
        .pg-game { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100dvh !important; overflow: hidden !important; background: #000 !important; }
        .pg-shell {
          width: min(720px, calc(100vw - 16px)) !important;
          height: 100dvh !important;
          margin: 0 auto !important;
          padding: max(8px, env(safe-area-inset-top)) 0 max(8px, env(safe-area-inset-bottom)) !important;
          display: grid !important;
          grid-template-rows: 72px minmax(0, 1fr) auto auto auto !important;
          gap: 6px !important;
          overflow: hidden !important;
        }

        /* Compact player rail */
        .pg-header { position: relative !important; min-height: 72px !important; height: 72px !important; padding: 3px 6px !important; display: grid !important; grid-template-columns: minmax(0,1fr) 70px minmax(0,1fr) !important; gap: 5px !important; align-items: center !important; overflow: visible !important; }
        .pg-player:nth-child(1) { grid-column: 1 !important; grid-row: 1 !important; }
        .pg-player:nth-child(2) { grid-column: 3 !important; grid-row: 1 !important; }
        .pg-player { min-width: 0 !important; height: 58px !important; padding: 3px 6px !important; gap: 6px !important; overflow: hidden !important; }
        .pg-avatar-btn { width: 34px !important; height: 34px !important; flex: 0 0 34px !important; padding: 0 !important; border: 0 !important; background: transparent !important; }
        .pg-avatar { width: 34px !important; height: 34px !important; overflow: hidden !important; }
        .pg-avatar > span { width: 100% !important; height: 100% !important; }
        .pg-player-copy { min-width: 0 !important; overflow: hidden !important; }
        .pg-player-copy b { font-size: 10px !important; line-height: 1.1 !important; max-width: 100% !important; }
        .pg-player-copy small { font-size: 7px !important; line-height: 1.15 !important; }
        .pg-star { font-size: 8px !important; margin-left: 2px !important; }
        .pg-crown { font-size: 10px !important; }
        .pg-logo { grid-column: 2 !important; grid-row: 1 !important; position: relative !important; left: auto !important; top: auto !important; transform: none !important; justify-self: center !important; width: 62px !important; height: 62px !important; z-index: 5 !important; }
        .pg-menu { display: none !important; }

        /* BOARD IS THE HERO: width controls its size on every phone. No viewport-height sizing. */
        .lux-board-zone { min-height: 0 !important; display: flex !important; align-items: flex-start !important; justify-content: center !important; overflow: visible !important; }
        .pg-board-frame { width: min(calc(100vw - 16px), 620px) !important; max-width: 100% !important; height: auto !important; aspect-ratio: 1 / 1 !important; flex: 0 0 auto !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
        .pg-board-frame > div { width: 100% !important; height: 100% !important; aspect-ratio: 1 / 1 !important; }

        /* Keep the interaction area compact and secondary to the board. */
        .pg-bottom { display: grid !important; grid-template-columns: minmax(0,1fr) minmax(0,1.75fr) minmax(72px,.48fr) !important; gap: 6px !important; height: 136px !important; min-height: 136px !important; }
        .pg-profile-card, .pg-turn-card { height: 136px !important; min-height: 136px !important; overflow: hidden !important; }
        .pg-profile-card { padding: 8px !important; display: grid !important; grid-template-columns: 48px minmax(0,1fr) !important; grid-template-rows: 44px 1fr 26px !important; column-gap: 7px !important; align-items: center !important; }
        .pg-profile-avatar { grid-column: 1 !important; grid-row: 1 / span 2 !important; width: 38px !important; height: 38px !important; margin: 0 !important; align-self: start !important; }
        .pg-profile-avatar > span { width: 100% !important; height: 100% !important; }
        .pg-profile-card strong { grid-column: 2 !important; grid-row: 1 !important; font-size: 12px !important; }
        .pg-stars { grid-column: 2 !important; grid-row: 1 !important; font-size: 9px !important; }
        .pg-edit { grid-column: 2 !important; grid-row: 1 !important; }
        .pg-coin-row { grid-column: 1 / -1 !important; grid-row: 3 !important; width: 100% !important; height: 26px !important; margin: 0 !important; padding: 4px 7px !important; font-size: 10px !important; }
        .pg-coin-row a { display: none !important; }
        .pg-turn-card { position: relative !important; padding: 10px !important; display: block !important; }
        .pg-turn-title { max-width: 48% !important; font-size: 14px !important; line-height: 1.05 !important; }
        .pg-turn-card p { max-width: 46% !important; margin: 5px 0 0 !important; font-size: 8px !important; line-height: 1.2 !important; }
        .pg-dice { right: 2px !important; top: 52% !important; bottom: auto !important; transform: translateY(-50%) scale(.56) !important; transform-origin: center right !important; margin: 0 !important; }
        .pg-comm-actions { height: 136px !important; gap: 6px !important; }
        .pg-comm-actions > button, .pg-voice button { min-height: 65px !important; border-radius: 15px !important; }
        .pg-comm-actions > button span { font-size: 18px !important; }
        .pg-comm-actions b { font-size: 8px !important; }
        .pg-voice { height: 65px !important; }
        .pg-reaction-row { height: 38px !important; min-height: 38px !important; display: flex !important; flex-wrap: nowrap !important; gap: 5px !important; overflow: hidden !important; }
        .pg-reaction-row button { min-width: 0 !important; padding: 5px 3px !important; font-size: 8px !important; white-space: nowrap !important; }
        .pg-utility-row { height: 40px !important; min-height: 40px !important; display: flex !important; gap: 5px !important; }
        .pg-utility-row button { min-height: 38px !important; font-size: 8px !important; }
        .pg-room { flex: 1.5 !important; }
        .lux-modal-bg { z-index: 100 !important; }

        @media (max-width: 560px) {
          .pg-shell { width: calc(100vw - 10px) !important; grid-template-rows: 64px minmax(0,1fr) auto auto auto !important; gap: 5px !important; }
          .pg-header { grid-template-columns: minmax(0,1fr) 60px minmax(0,1fr) !important; height: 64px !important; min-height: 64px !important; }
          .pg-logo { width: 54px !important; height: 54px !important; }
          .pg-player { height: 54px !important; padding: 3px 5px !important; }
          .pg-avatar-btn, .pg-avatar { width: 31px !important; height: 31px !important; flex-basis: 31px !important; }
          .pg-player-copy b { font-size: 9px !important; }
          .pg-player-copy small { font-size: 6px !important; }
          .pg-star { font-size: 7px !important; }
          .pg-board-frame { width: calc(100vw - 10px) !important; }
          .pg-bottom, .pg-profile-card, .pg-turn-card, .pg-comm-actions { height: 126px !important; min-height: 126px !important; }
          .pg-profile-card { grid-template-columns: 44px minmax(0,1fr) !important; grid-template-rows: 40px 1fr 24px !important; padding: 7px !important; }
          .pg-profile-avatar { width: 35px !important; height: 35px !important; }
          .pg-profile-card strong { font-size: 11px !important; }
          .pg-stars { font-size: 8px !important; }
          .pg-coin-row { height: 24px !important; font-size: 9px !important; }
          .pg-turn-card { padding: 9px !important; }
          .pg-turn-title { font-size: 13px !important; }
          .pg-turn-card p { font-size: 7px !important; }
          .pg-dice { transform: translateY(-50%) scale(.51) !important; }
          .pg-comm-actions > button, .pg-voice button { min-height: 60px !important; }
          .pg-comm-actions > button span { font-size: 16px !important; }
          .pg-voice { height: 60px !important; }
          .pg-reaction-row { height: 35px !important; min-height: 35px !important; }
          .pg-utility-row { height: 37px !important; min-height: 37px !important; }
        }

        @media (max-width: 380px) {
          .pg-shell { width: calc(100vw - 6px) !important; padding-top: 5px !important; }
          .pg-header { grid-template-columns: minmax(0,1fr) 52px minmax(0,1fr) !important; height: 58px !important; min-height: 58px !important; }
          .pg-logo { width: 47px !important; height: 47px !important; }
          .pg-player { height: 49px !important; padding: 2px 4px !important; }
          .pg-avatar-btn, .pg-avatar { width: 28px !important; height: 28px !important; flex-basis: 28px !important; }
          .pg-player-copy b { font-size: 8px !important; }
          .pg-player-copy small { font-size: 5px !important; }
          .pg-board-frame { width: calc(100vw - 6px) !important; }
          .pg-bottom, .pg-profile-card, .pg-turn-card, .pg-comm-actions { height: 116px !important; min-height: 116px !important; }
          .pg-profile-card { grid-template-columns: 40px minmax(0,1fr) !important; grid-template-rows: 36px 1fr 22px !important; }
          .pg-profile-avatar { width: 32px !important; height: 32px !important; }
          .pg-profile-card strong { font-size: 10px !important; }
          .pg-stars { font-size: 7px !important; }
          .pg-coin-row { height: 22px !important; font-size: 8px !important; }
          .pg-turn-title { font-size: 12px !important; }
          .pg-turn-card p { font-size: 6.5px !important; }
          .pg-dice { transform: translateY(-50%) scale(.47) !important; }
          .pg-comm-actions > button, .pg-voice button { min-height: 55px !important; }
          .pg-comm-actions > button span { font-size: 14px !important; }
          .pg-voice { height: 55px !important; }
          .pg-reaction-row { height: 32px !important; min-height: 32px !important; }
          .pg-utility-row { height: 34px !important; min-height: 34px !important; }
        }

        /* On short screens, compress everything around the board. The board keeps its width. */
        @media (max-height: 680px) {
          .pg-shell { padding-top: 4px !important; gap: 4px !important; }
          .pg-header { height: 54px !important; min-height: 54px !important; }
          .pg-logo { width: 46px !important; height: 46px !important; }
          .pg-player { height: 46px !important; }
          .pg-bottom, .pg-profile-card, .pg-turn-card, .pg-comm-actions { height: 104px !important; min-height: 104px !important; }
          .pg-comm-actions > button, .pg-voice button { min-height: 48px !important; }
          .pg-voice { height: 48px !important; }
          .pg-reaction-row { height: 30px !important; min-height: 30px !important; }
          .pg-utility-row { height: 32px !important; min-height: 32px !important; }
        }
      `}</style>
    </div>
  );
}
