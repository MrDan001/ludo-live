import type { ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style>{`
        /* /game-online?room=... only: one stable square board dimension. */
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
          flex: 0 0 auto !important;
          box-sizing: border-box !important;
          width: min(96vw, 760px, calc(100% - 12px)) !important;
          height: min(96vw, 760px, calc(100% - 12px)) !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: calc(100% - 12px) !important;
          max-height: calc(100% - 12px) !important;
          aspect-ratio: 1 / 1 !important;
          margin: auto !important;
        }

        .ludo-live-wrapper .ll-board-frame > div {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          aspect-ratio: 1 / 1 !important;
        }
      `}</style>
    </>
  );
}
