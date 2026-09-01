import type { ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style jsx global>{`
        /* /game-online only: the board is sized by the visible game stage.
           Do not use JS measurement or container-query units here; both can
           transiently resolve to zero during a mobile refresh/reflow. */
        .ludo-live-wrapper .ll-board-stage {
          min-width: 0 !important;
          min-height: 0 !important;
          width: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          display: grid !important;
          place-items: center !important;
          overflow: hidden !important;
        }

        .ludo-live-wrapper .ll-board-frame {
          flex: none !important;
          flex-shrink: 0 !important;
          box-sizing: border-box !important;
          width: min(92vw, 680px) !important;
          height: auto !important;
          aspect-ratio: 1 / 1 !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: calc(100% - 16px) !important;
          max-height: calc(100% - 16px) !important;
          margin: auto !important;
        }

        .ludo-live-wrapper .ll-board-frame > div {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          aspect-ratio: 1 / 1 !important;
        }

        @media (max-width: 700px) {
          .ludo-live-wrapper .ll-board-frame {
            width: 96vw !important;
            max-width: calc(100% - 12px) !important;
            max-height: calc(100% - 12px) !important;
          }
        }
      `}</style>
    </>
  );
}
