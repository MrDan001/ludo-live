import type { ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        /* /game-online only: one responsive layout model, not stacked patches. */
        html, body { overflow: hidden !important; }
        .ludo-live-wrapper { height: 100dvh !important; min-height: 0 !important; overflow: hidden !important; }
        .ludo-live-wrapper .ludo-live-container {
          height: 100dvh !important; min-height: 0 !important; overflow: hidden !important; box-sizing: border-box !important;
          display: grid !important; grid-template-rows: auto minmax(0, 1fr) auto !important;
        }
        .ludo-live-wrapper .ll-board-stage {
          min-width: 0 !important; min-height: 0 !important; width: 100% !important; height: 100% !important;
          overflow: hidden !important; display: flex !important; align-items: center !important; justify-content: center !important;
          box-sizing: border-box !important; padding: 0 !important;
        }
        .ludo-live-wrapper .ll-board-frame {
          width: min(100%, 680px) !important; height: auto !important; aspect-ratio: 1 / 1 !important;
          max-width: 100% !important; max-height: 100% !important; min-width: 0 !important; min-height: 0 !important;
          flex: 0 1 auto !important; box-sizing: border-box !important; margin: 0 !important;
        }
        .ludo-live-wrapper .ll-board-frame > * {
          width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important;
          box-sizing: border-box !important;
        }

        /* Long/narrow phones: header + compact HUD are fixed; the board owns the entire middle stage. */
        @media (orientation: portrait) and (max-width: 900px) and (max-aspect-ratio: 1 / 2) {
          .ludo-live-wrapper .ludo-live-container {
            padding: 8px 10px 6px !important; grid-template-rows: 88px minmax(0, 1fr) 218px !important; gap: 0 !important;
          }
          .ludo-live-wrapper .multiplayer-topbar {
            min-height: 88px !important; height: 88px !important; padding: 2px 0 6px !important; gap: 7px !important;
          }
          .ludo-live-wrapper .multiplayer-player-card {
            height: 70px !important; min-height: 70px !important; padding: 7px 9px !important; gap: 7px !important;
          }
          .ludo-live-wrapper .multiplayer-player-avatar { width: 50px !important; height: 50px !important; flex-basis: 50px !important; }
          .ludo-live-wrapper .multiplayer-topbar-logo strong { font-size: 25px !important; }
          .ludo-live-wrapper .multiplayer-topbar-logo span:last-child { font-size: 13px !important; }

          /* The opponent name is literally empty when nobody is seated; only then suppress the stale fallback level. */
          .ludo-live-wrapper .multiplayer-player-card-opponent:has(.multiplayer-player-name-row strong:empty) .multiplayer-level-badge { display: none !important; }

          .ludo-live-wrapper .ll-bottom-panel {
            height: 218px !important; min-height: 218px !important; max-height: 218px !important; gap: 5px !important; overflow: hidden !important;
          }
          .ludo-live-wrapper .ll-controls-row {
            height: 146px !important; min-height: 146px !important;
            grid-template-columns: minmax(104px, .78fr) minmax(0, 1.5fr) 52px !important; gap: 5px !important;
          }
          .ludo-live-wrapper .ll-user-box,
          .ludo-live-wrapper .ll-dice-box {
            height: 146px !important; min-height: 146px !important; padding: 7px !important; border-radius: 14px !important; box-sizing: border-box !important;
          }
          .ludo-live-wrapper .ll-user-avatar { width: 42px !important; height: 42px !important; flex-basis: 42px !important; }
          .ludo-live-wrapper .ll-u-name { font-size: 11px !important; }
          .ludo-live-wrapper .ll-u-level { font-size: 8px !important; }
          .ludo-live-wrapper .ll-coins-pill { height: 29px !important; min-height: 29px !important; padding: 5px 8px !important; }

          /* Full dice: a dedicated 78px slot clips nothing because the cube is scaled inside that slot. */
          .ludo-live-wrapper .ll-dice-box {
            display: grid !important; grid-template-columns: minmax(0, 1fr) 78px !important; gap: 2px !important; overflow: hidden !important;
          }
          .ludo-live-wrapper .ll-turn-copy { min-width: 0 !important; padding: 1px 0 0 !important; overflow: hidden !important; }
          .ludo-live-wrapper .ll-turn-title { font-size: 10px !important; white-space: nowrap !important; }
          .ludo-live-wrapper .ll-turn-sub { font-size: 8px !important; line-height: 1.2 !important; }
          .ludo-live-wrapper .ll-dice-slot {
            width: 78px !important; min-width: 78px !important; max-width: 78px !important; min-height: 0 !important;
            overflow: visible !important; display: flex !important; flex-direction: column !important; align-items: center !important;
            justify-content: center !important; box-sizing: border-box !important;
          }
          .ludo-live-wrapper .ll-dice-slot .dice-area {
            width: 112px !important; max-width: 112px !important; transform: scale(.48) !important;
            transform-origin: center center !important; margin: -22px !important; flex: 0 0 54px !important;
          }
          .ludo-live-wrapper .ll-dice-result { width: 54px !important; height: 25px !important; font-size: 15px !important; }
          .ludo-live-wrapper .ll-dice-hint { width: 70px !important; font-size: 7px !important; white-space: nowrap !important; text-align: center !important; }

          .ludo-live-wrapper .ll-side-actions { gap: 5px !important; }
          .ludo-live-wrapper .ll-action-btn { width: 52px !important; height: 70px !important; min-height: 70px !important; border-radius: 12px !important; gap: 1px !important; }
          .ludo-live-wrapper .action-icon { font-size: 14px !important; }
          .ludo-live-wrapper .ll-action-btn span:last-child { font-size: 8px !important; }
          .ludo-live-wrapper .ll-reactions-bar { height: 31px !important; min-height: 31px !important; gap: 4px !important; overflow: hidden !important; }
          .ludo-live-wrapper .ll-pill-btn { height: 31px !important; min-height: 31px !important; padding: 5px 8px !important; font-size: 8px !important; }
          .ludo-live-wrapper .ll-footer { height: 31px !important; min-height: 31px !important; gap: 5px !important; overflow: hidden !important; }
          .ludo-live-wrapper .ll-foot-btn,
          .ludo-live-wrapper .ll-room-chip { height: 31px !important; min-height: 31px !important; padding: 5px 8px !important; font-size: 8px !important; }
        }
      ` }} />
    </>
  );
}
