import type { ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Responsive game-online composition: keep the board prominent without squeezing the lower controls. */
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

        /* Portrait phones: deliberately reserve visual room for the bottom panel. */
        @media (max-width: 700px) {
          .ludo-live-wrapper .ll-board-frame {
            width: min(78vw, 500px) !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: calc(100% - 2px) !important;
          }
        }

        /* Short portrait phones: height becomes the limiting dimension. */
        @media (max-width: 700px) and (max-height: 760px) {
          .ludo-live-wrapper .ll-board-frame {
            width: min(78vw, calc(100dvh - 430px), 500px) !important;
            max-height: calc(100% - 2px) !important;
          }
        }
      ` }} />
    </>
  );
}
