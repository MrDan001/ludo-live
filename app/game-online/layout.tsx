"use client";

import type { ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style jsx global>{`
        /* /game-online only: size the square board from its real stage. */
        .ludo-live-wrapper .ll-board-stage {
          container-type: size;
          container-name: game-online-board-stage;
          min-width: 0 !important;
          min-height: 0 !important;
          width: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
        }

        .ludo-live-wrapper .ll-board-frame {
          flex: 0 0 auto !important;
          flex-shrink: 0 !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: 100% !important;
          max-height: 100% !important;
          width: min(100cqw, calc(100cqh - 16px)) !important;
          height: min(100cqw, calc(100cqh - 16px)) !important;
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

        /* Keep the tiny breathing margin on very short mobile stages too. */
        @media (max-width: 700px) {
          .ludo-live-wrapper .ll-board-frame {
            width: min(100cqw, calc(100cqh - 12px)) !important;
            height: min(100cqw, calc(100cqh - 12px)) !important;
          }
        }
      `}</style>
    </>
  );
}
