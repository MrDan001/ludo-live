import type { ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        /* game-online: keep the board inside the real middle grid track on every portrait phone */
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
          padding: 2px 0 12px !important;
        }
        .ludo-live-wrapper .ll-board-frame {
          box-sizing: border-box !important;
          width: min(100%, 680px) !important;
          height: auto !important;
          aspect-ratio: 1 / 1 !important;
          max-width: 100% !important;
          max-height: 100% !important;
          flex: 0 1 auto !important;
          margin: 0 auto !important;
        }
        .ludo-live-wrapper .ll-board-frame > * {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }
        /* Never let the old tall-screen height hacks collapse the board. */
        @media (max-width: 700px) {
          .ludo-live-wrapper .ll-board-stage { height: 100% !important; }
          .ludo-live-wrapper .ll-board-frame {
            width: min(100%, 680px) !important;
            height: auto !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
        }
      ` }} />
    </>
  );
}
