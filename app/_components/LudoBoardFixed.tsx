"use client";
import React from "react";
import BaseBoard, { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId, type DemoToken } from "./LudoBoard";

export type { BoardThemeId, DemoToken };
export { BOARD_NAMES, BOARD_PALETTES };

type Props = React.ComponentProps<typeof BaseBoard>;

const FRAME_STYLES: Record<BoardThemeId, { accent: string; shadow: string }> = {
  classic: { accent: "#222", shadow: "0 10px 24px rgba(0,0,0,.18)" },
  golden: { accent: "#8a5a12", shadow: "0 10px 30px rgba(221,170,44,.42)" },
  neon: { accent: "#7cf7ff", shadow: "0 0 30px rgba(0,229,255,.38)" },
  beach: { accent: "#2c7080", shadow: "0 10px 26px rgba(65,145,170,.28)" },
  galaxy: { accent: "#a9c9ff", shadow: "0 10px 32px rgba(86,84,255,.48)" },
  wood: { accent: "#5b321b", shadow: "0 12px 30px rgba(64,28,9,.5)" },
  dragon: { accent: "#dcae4d", shadow: "0 12px 32px rgba(190,46,28,.42)" },
  christmas: { accent: "#d9b74c", shadow: "0 12px 30px rgba(15,90,55,.4)" },
  football: { accent: "#74d68a", shadow: "0 12px 30px rgba(0,80,40,.45)" },
  candy: { accent: "#9a4d9e", shadow: "0 12px 30px rgba(182,90,177,.32)" },
  marble: { accent: "#b08a3c", shadow: "0 12px 30px rgba(90,100,115,.28)" },
  nature: { accent: "#8bb65b", shadow: "0 12px 30px rgba(26,80,37,.48)" },
  space: { accent: "#6bdcff", shadow: "0 0 36px rgba(57,157,255,.5)" },
  crystal: { accent: "#7bc9ee", shadow: "0 12px 32px rgba(90,190,235,.38)" },
  fireice: { accent: "#f2b94b", shadow: "0 12px 34px rgba(230,85,45,.4)" },
  jungle: { accent: "#6e9f45", shadow: "0 12px 32px rgba(20,80,28,.46)" },
  love: { accent: "#d84b86", shadow: "0 12px 30px rgba(216,75,134,.32)" },
  night: { accent: "#4e76a8", shadow: "0 12px 34px rgba(0,0,0,.6)" },
  arabian: { accent: "#d7ad4d", shadow: "0 12px 34px rgba(150,92,25,.46)" },
};

export default function LudoBoardFixed({ theme = "classic", className = "", ...props }: Props) {
  const frame = FRAME_STYLES[theme] || FRAME_STYLES.classic;
  return (
    <div
      className={`ludo-board-frame theme-${theme}`}
      style={{
        "--board-accent": frame.accent,
        "--board-shadow": frame.shadow,
      } as React.CSSProperties}
    >
      <BaseBoard
        {...props}
        theme={theme}
        className={`ludo-board-inner ${className}`.trim()}
      />
      <style jsx global>{`
        .ludo-board-frame {
          width: calc(100% + 12px);
          aspect-ratio: 1;
          margin: -6px auto;
          padding: 6px;
          box-sizing: border-box;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          isolation: isolate;
          box-shadow: 0 0 0 3px var(--board-accent), var(--board-shadow);
        }
        .ludo-board-frame > .ludo-board-inner.shared-ludo-board {
          width: 100% !important;
          height: 100% !important;
          aspect-ratio: auto !important;
          box-shadow: none !important;
          border-radius: 12px !important;
        }
      `}</style>
    </div>
  );
}
