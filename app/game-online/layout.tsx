import type { ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Route-scoped responsive composition for /game-online. */
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
          width: min(90vw, 600px) !important;
          height: auto !important;
          aspect-ratio: 1 / 1 !important;
          max-width: 100% !important;
          max-height: calc(100% - 4px) !important;
          flex: 0 0 auto !important;
          margin: 0 auto !important;
        }

        .ludo-live-wrapper .ll-board-frame > * {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }

        /* Short portrait screens: the available middle-stage height becomes the limit. */
        @media (orientation: portrait) and (max-width: 700px) and (max-height: 900px) {
          .ludo-live-wrapper .ll-board-frame {
            width: min(90vw, calc(100dvh - 360px), 600px) !important;
            max-height: calc(100% - 4px) !important;
          }
        }

        /* Tall/narrow Android portrait screens: compact the bottom HUD so the board gets the freed height. */
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

          /* No opponent data = no stale level badge. The name element is intentionally empty while waiting. */
          .ludo-live-wrapper .multiplayer-player-card-opponent:has(.multiplayer-player-name-row strong:empty) .multiplayer-level-badge {
            display: none !important;
          }

          .ludo-live-wrapper .ll-bottom-panel {
            height: 248px !important;
            min-height: 248px !important;
            max-height: 248px !important;
            gap: 5px !important;
            overflow: hidden !important;
          }

          .ludo-live-wrapper .ll-controls-row {
            height: 162px !important;
            min-height: 162px !important;
            grid-template-columns: minmax(112px, .82fr) minmax(0, 1.4fr) 56px !important;
            gap: 6px !important;
          }

          .ludo-live-wrapper .ll-user-box,
          .ludo-live-wrapper .ll-dice-box {
            min-height: 0 !important;
            height: 162px !important;
            padding: 8px !important;
            border-radius: 15px !important;
          }

          .ludo-live-wrapper .ll-user-header { gap: 6px !important; }
          .ludo-live-wrapper .ll-user-avatar {
            width: 46px !important;
            height: 46px !important;
            flex-basis: 46px !important;
          }

          .ludo-live-wrapper .ll-u-name { font-size: 12px !important; }
          .ludo-live-wrapper .ll-u-level { font-size: 9px !important; }
          .ludo-live-wrapper .ll-coins-pill { min-height: 32px !important; height: 32px !important; padding: 6px 9px !important; }

          /* Keep the whole dice inside its column. DemoDice has a 150px intrinsic width, so both its layout width and visual size are reduced here. */
          .ludo-live-wrapper .ll-dice-box { grid-template-columns: minmax(0, 1fr) 76px !important; gap: 2px !important; overflow: hidden !important; }
          .ludo-live-wrapper .ll-turn-copy { min-width: 0 !important; padding-top: 1px !important; }
          .ludo-live-wrapper .ll-turn-title { font-size: 11px !important; white-space: nowrap !important; }
          .ludo-live-wrapper .ll-turn-sub { font-size: 9px !important; line-height: 1.2 !important; }
          .ludo-live-wrapper .ll-dice-result { width: 58px !important; height: 27px !important; font-size: 16px !important; }
          .ludo-live-wrapper .ll-dice-hint { width: 68px !important; font-size: 7px !important; white-space: nowrap !important; }
          .ludo-live-wrapper .ll-dice-slot { min-width: 70px !important; width: 76px !important; overflow: visible !important; display: grid !important; place-items: center !important; }
          .ludo-live-wrapper .ll-dice-slot .dice-area { min-width: 0 !important; width: 110px !important; transform: scale(.55) !important; transform-origin: center center !important; }

          .ludo-live-wrapper .ll-side-actions { gap: 6px !important; }
          .ludo-live-wrapper .ll-action-btn {
            width: 56px !important;
            height: 78px !important;
            min-height: 78px !important;
            border-radius: 13px !important;
            gap: 2px !important;
          }
          .ludo-live-wrapper .action-icon { font-size: 15px !important; }
          .ludo-live-wrapper .ll-action-btn span:last-child { font-size: 8px !important; }

          .ludo-live-wrapper .ll-reactions-bar {
            height: 34px !important;
            min-height: 34px !important;
            gap: 5px !important;
            overflow: hidden !important;
          }
          .ludo-live-wrapper .ll-pill-btn {
            min-height: 34px !important;
            height: 34px !important;
            padding: 6px 10px !important;
            font-size: 9px !important;
            border-radius: 14px !important;
          }

          .ludo-live-wrapper .ll-footer {
            height: 34px !important;
            min-height: 34px !important;
            gap: 6px !important;
            overflow: hidden !important;
          }
          .ludo-live-wrapper .ll-foot-btn,
          .ludo-live-wrapper .ll-room-chip {
            min-height: 34px !important;
            height: 34px !important;
            padding: 6px 10px !important;
            font-size: 9px !important;
            border-radius: 13px !important;
          }

          .ludo-live-wrapper .ll-board-frame {
            width: min(90vw, 600px) !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: calc(100% - 4px) !important;
          }
        }
      ` }} />
    </>
  );
}
