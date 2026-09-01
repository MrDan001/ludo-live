import type { ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Responsive game-online composition: the board and HUD share the viewport instead of fighting for it. */
        html, body { overflow: hidden !important; }

        .ludo-live-wrapper { height: 100dvh !important; min-height: 0 !important; }

        .ludo-live-wrapper .ludo-live-container {
          height: 100dvh !important;
          min-height: 0 !important;
          grid-template-rows: auto minmax(0, 1fr) auto !important;
          overflow: hidden !important;
        }

        .ludo-live-wrapper .ll-board-stage {
          min-height: 0 !important;
          min-width: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 2px 0 8px !important;
        }

        .ludo-live-wrapper .ll-board-frame {
          box-sizing: border-box !important;
          width: min(78vw, 500px) !important;
          height: auto !important;
          aspect-ratio: 1 / 1 !important;
          max-width: 100% !important;
          max-height: calc(100% - 2px) !important;
          flex: 0 0 auto !important;
          margin: 0 auto !important;
        }

        .ludo-live-wrapper .ll-board-frame > * {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }

        @media (max-width: 700px) {
          .ludo-live-wrapper .ll-board-frame {
            width: min(78vw, 500px) !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: calc(100% - 2px) !important;
          }
        }

        @media (max-width: 700px) and (max-height: 760px) {
          .ludo-live-wrapper .ll-board-frame {
            width: min(78vw, calc(100dvh - 430px), 500px) !important;
            max-height: calc(100% - 2px) !important;
          }
        }

        /*
         * Tall/narrow Android portrait screens need their own composition.
         * The previous 700px breakpoint missed devices whose CSS viewport is
         * around 720px wide, leaving the desktop-sized HUD to overflow below
         * the viewport and making the dice/card area disappear.
         */
        @media (orientation: portrait) and (max-width: 900px) and (max-aspect-ratio: 1 / 2) {
          .ludo-live-wrapper .ludo-live-container {
            padding: 10px 12px 8px !important;
          }

          .ludo-live-wrapper .multiplayer-topbar {
            min-height: 96px !important;
            padding: 2px 0 8px !important;
            gap: 8px !important;
          }

          .ludo-live-wrapper .multiplayer-player-card {
            height: 76px !important;
            padding: 8px 10px !important;
            gap: 8px !important;
          }

          .ludo-live-wrapper .multiplayer-player-avatar {
            width: 54px !important;
            height: 54px !important;
            flex-basis: 54px !important;
          }

          .ludo-live-wrapper .multiplayer-player-name-row strong { font-size: 13px !important; }
          .ludo-live-wrapper .multiplayer-player-status { font-size: 10px !important; }
          .ludo-live-wrapper .multiplayer-level-badge { font-size: 11px !important; }

          .ludo-live-wrapper .multiplayer-topbar-logo strong { font-size: 27px !important; }
          .ludo-live-wrapper .multiplayer-topbar-logo span:last-child { font-size: 15px !important; }

          .ludo-live-wrapper .ll-bottom-panel {
            height: 300px !important;
            min-height: 300px !important;
            max-height: 300px !important;
            gap: 6px !important;
            overflow: hidden !important;
          }

          .ludo-live-wrapper .ll-controls-row {
            height: 205px !important;
            min-height: 205px !important;
            grid-template-columns: minmax(118px, .82fr) minmax(0, 1.4fr) 62px !important;
            gap: 7px !important;
          }

          .ludo-live-wrapper .ll-user-box,
          .ludo-live-wrapper .ll-dice-box {
            min-height: 0 !important;
            padding: 9px !important;
            border-radius: 16px !important;
          }

          .ludo-live-wrapper .ll-user-header { gap: 7px !important; }
          .ludo-live-wrapper .ll-user-avatar {
            width: 50px !important;
            height: 50px !important;
            flex-basis: 50px !important;
          }

          .ludo-live-wrapper .ll-u-name { font-size: 13px !important; }
          .ludo-live-wrapper .ll-u-level { font-size: 10px !important; }
          .ludo-live-wrapper .ll-coins-pill { min-height: 36px !important; padding: 7px 10px !important; }

          .ludo-live-wrapper .ll-dice-box { grid-template-columns: minmax(0, 1fr) 88px !important; gap: 4px !important; }
          .ludo-live-wrapper .ll-turn-copy { min-width: 0 !important; padding-top: 2px !important; }
          .ludo-live-wrapper .ll-turn-title { font-size: 12px !important; }
          .ludo-live-wrapper .ll-turn-sub { font-size: 10px !important; line-height: 1.25 !important; }
          .ludo-live-wrapper .ll-dice-result { width: 66px !important; height: 30px !important; font-size: 17px !important; }
          .ludo-live-wrapper .ll-dice-hint { width: 76px !important; font-size: 8px !important; }
          .ludo-live-wrapper .ll-dice-slot { min-width: 78px !important; overflow: visible !important; }
          .ludo-live-wrapper .ll-dice-slot :global(.dice-area) { transform: scale(.68) !important; transform-origin: center !important; }

          .ludo-live-wrapper .ll-side-actions { gap: 6px !important; }
          .ludo-live-wrapper .ll-action-btn {
            width: 62px !important;
            height: 99px !important;
            min-height: 99px !important;
            border-radius: 14px !important;
            gap: 3px !important;
          }
          .ludo-live-wrapper .action-icon { font-size: 16px !important; }
          .ludo-live-wrapper .ll-action-btn span:last-child { font-size: 9px !important; }

          .ludo-live-wrapper .ll-reactions-bar {
            height: 38px !important;
            min-height: 38px !important;
            gap: 6px !important;
            overflow: hidden !important;
          }
          .ludo-live-wrapper .ll-pill-btn {
            min-height: 38px !important;
            padding: 7px 12px !important;
            font-size: 10px !important;
            border-radius: 15px !important;
          }

          .ludo-live-wrapper .ll-footer {
            height: 38px !important;
            min-height: 38px !important;
            gap: 7px !important;
            overflow: hidden !important;
          }
          .ludo-live-wrapper .ll-foot-btn,
          .ludo-live-wrapper .ll-room-chip {
            min-height: 38px !important;
            padding: 7px 11px !important;
            font-size: 10px !important;
            border-radius: 14px !important;
          }

          /* Let the board use the real middle-stage space, but never steal HUD height. */
          .ludo-live-wrapper .ll-board-frame {
            width: min(82vw, 540px) !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: calc(100% - 4px) !important;
          }
        }
      ` }} />
    </>
  );
}
