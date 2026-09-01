"use client";

import { useEffect, type ReactNode } from "react";

export default function GameOnlineLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const updateBoardSize = () => {
      const stage = document.querySelector(".ludo-live-wrapper .ll-board-stage");
      if (!(stage instanceof HTMLElement)) return;

      const rect = stage.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      if (Number.isFinite(size) && size > 0) {
        stage.style.setProperty("--ll-board-size", `${size}px`);
      }
    };

    let observer: ResizeObserver | null = null;
    const attach = () => {
      const stage = document.querySelector(".ludo-live-wrapper .ll-board-stage");
      if (!(stage instanceof HTMLElement)) return;
      observer = new ResizeObserver(updateBoardSize);
      observer.observe(stage);
      updateBoardSize();
      window.visualViewport?.addEventListener("resize", updateBoardSize);
    };

    const frame = window.requestAnimationFrame(attach);
    window.addEventListener("resize", updateBoardSize);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", updateBoardSize);
      window.visualViewport?.removeEventListener("resize", updateBoardSize);
    };
  }, []);

  return (
    <>
      {children}
      <style jsx global>{`
        .ludo-live-wrapper .ll-board-stage {
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
          width: var(--ll-board-size, 100%) !important;
          height: var(--ll-board-size, auto) !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: 100% !important;
          max-height: 100% !important;
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
