import type { ReactNode } from "react";

/**
 * Route shell for the rebuilt /game-online page.
 * The page owns the HUD and board composition. This route wrapper only guarantees
 * that the square board is sized from the phone's WIDTH, not from viewport HEIGHT.
 * That distinction is critical on long/narrow phones.
 */
export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        .ll-rebuilt-page .ll-board-stage {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        .ll-rebuilt-page .ll-board-frame {
          width: min(calc(100vw - 20px), 680px) !important;
          height: min(calc(100vw - 20px), 680px) !important;
          max-width: calc(100vw - 20px) !important;
          max-height: calc(100vw - 20px) !important;
          min-width: 0 !important;
          min-height: 0 !important;
          aspect-ratio: 1 / 1 !important;
          flex: 0 0 auto !important;
          margin: 0 auto !important;
        }

        .ll-rebuilt-page .ll-board-frame > .mp-board-wrap,
        .ll-rebuilt-page .ll-board-frame > .mp-board-wrap > div:first-child {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
        }

        @media (min-width: 701px) {
          .ll-rebuilt-page .ll-board-frame {
            width: min(calc(100vw - 40px), 620px) !important;
            height: min(calc(100vw - 40px), 620px) !important;
            max-width: calc(100vw - 40px) !important;
            max-height: calc(100vw - 40px) !important;
          }
        }
      ` }} />
    </>
  );
}
