// Board UI component
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerColor, ALL_COLORS } from "@/lib/engine";
import {
  BASE_ZONE,
  BASE_COORDS,
  GLOBAL_PATH_COORDS,
  HOME_STRETCH_COORDS,
  CENTER_COORD,
  ENTRY_COORDS,
  COLOR_BG_SOLID,
  COLOR_TEXT_SOLID,
  getSafeCoordSet,
  getRenderCoord,
} from "@/lib/engine/layout";
import Token from "./Token";

type CellType = "base" | "path" | "home" | "center" | "deco" | "empty";

interface CellInfo {
  type: CellType;
  color?: PlayerColor;
  safe?: boolean;
  entryColor?: PlayerColor;
  /** True for the 4 marked token-holder squares inside a yard (as
   *  opposed to the plain filler squares around them). Drives whether we
   *  draw a decorative empty-slot ring there when no token occupies it. */
  pipSlot?: boolean;
}

// Which lane direction each color's home stretch runs, so the inward
// arrow hints point the right way (toward the center).
const HOME_STRETCH_ARROW: Record<PlayerColor, string> = {
  RED: "→",
  GREEN: "↓",
  YELLOW: "←",
  BLUE: "↑",
};

function buildCellMap(): Record<string, CellInfo> {
  const map: Record<string, CellInfo> = {};

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      map[`${r},${c}`] = { type: "empty" };
    }
  }

  ALL_COLORS.forEach((color) => {
    const { rowStart, colStart } = BASE_ZONE[color];
    for (let r = rowStart; r < rowStart + 6; r++) {
      for (let c = colStart; c < colStart + 6; c++) {
        map[`${r},${c}`] = { type: "base", color };
      }
    }
    BASE_COORDS[color].forEach((coord) => {
      map[`${coord.row},${coord.col}`] = { type: "base", color, pipSlot: true };
    });
  });

  const safeSet = getSafeCoordSet();
  GLOBAL_PATH_COORDS.forEach((coord) => {
    const key = `${coord.row},${coord.col}`;
    map[key] = { type: "path", safe: safeSet.has(key) };
  });

  ALL_COLORS.forEach((color) => {
    const entry = ENTRY_COORDS[color];
    const key = `${entry.row},${entry.col}`;
    map[key] = { ...map[key], entryColor: color };
  });

  ALL_COLORS.forEach((color) => {
    HOME_STRETCH_COORDS[color].forEach((coord) => {
      map[`${coord.row},${coord.col}`] = { type: "home", color };
    });
  });

  map[`${CENTER_COORD.row},${CENTER_COORD.col}`] = { type: "center" };

  return map;
}

const CELL_MAP = buildCellMap();

// When 2+ tokens share a cell, they fan out with a slight offset instead
// of shrinking - each keeps its full size, later ones layer on top so all
// are still visible and tappable. Percentages are relative to the token
// wrapper's own box (i.e. the cell), so these stay small and subtle.
const STACK_OFFSETS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -13, y: -13 }, { x: 13, y: 13 }],
  3: [{ x: -15, y: -15 }, { x: 15, y: -15 }, { x: 0, y: 15 }],
  4: [{ x: -15, y: -15 }, { x: 15, y: -15 }, { x: -15, y: 15 }, { x: 15, y: 15 }],
};

// How long each single-cell hop takes. Tuned to feel like a token actually
// counting its way across the board rather than sliding smoothly or
// snapping instantly.
const STEP_DURATION_MS = 220;

type Pos = number | "YARD";

interface BoardProps {
  players: Player[];
  selectableTokenIds: Set<string>;
  onTokenClick: (tokenId: string) => void;
  /** Fires once every token that moved this turn has finished hopping
   *  through its full path and landed on its true final square. */
  onMoveAnimationComplete?: () => void;
  /** Display name shown on each color's yard badge (e.g. "Me" for the
   *  local player, an opponent's real name otherwise). Falls back to the
   *  plain color name for any color left unset. */
  playerNames?: Partial<Record<PlayerColor, string>>;
  /** Photo URL shown on each color's yard badge, in place of the letter
   *  avatar, when the seat has one. */
  playerAvatars?: Partial<Record<PlayerColor, string | undefined>>;
  /** Colors whose seat is currently unfilled - shown as a dashed empty
   *  slot instead of a name/avatar badge. */
  emptyColors?: Set<PlayerColor>;
  /** Colors that are disconnected (but still seated) - dims the badge. */
  disconnectedColors?: Set<PlayerColor>;
  /** Colors whose turn it is right now - gets the glowing highlight ring. */
  currentTurnColors?: Set<PlayerColor>;
  /** Fires once per token sent back to its yard by an opponent landing on
   *  it (not for a token simply starting the game in the yard). Lets the
   *  parent page show a toast, play a sound, etc. */
  onCapture?: (info: { tokenId: string; color: PlayerColor }) => void;
}

interface CaptureFlash {
  key: string;
  color: PlayerColor;
  row: number;
  col: number;
}

// How long the capture "burst" ring stays on screen before it's removed.
const CAPTURE_FLASH_MS = 700;

export default function Board({
  players,
  selectableTokenIds,
  onTokenClick,
  onMoveAnimationComplete,
  playerNames,
  playerAvatars,
  emptyColors,
  disconnectedColors,
  currentTurnColors,
  onCapture,
}: BoardProps) {
  const [displayPositions, setDisplayPositions] = useState<Record<string, Pos>>(() => {
    const initial: Record<string, Pos> = {};
    players.forEach((p) => p.tokens.forEach((t) => { initial[t.id] = t.position; }));
    return initial;
  });
  const [captureFlashes, setCaptureFlashes] = useState<CaptureFlash[]>([]);

  // Tracks the last *true* (server) position we diffed against - kept
  // separate from displayPositions so an in-flight hop animation doesn't
  // get confused with the authoritative game state driving it.
  const truePositionsRef = useRef<Record<string, Pos>>(displayPositions);
  const onCompleteRef = useRef(onMoveAnimationComplete);
  const onCaptureRef = useRef(onCapture);
  const flashSeqRef = useRef(0);

  useEffect(() => {
    onCompleteRef.current = onMoveAnimationComplete;
  }, [onMoveAnimationComplete]);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    const truePositions: Record<string, Pos> = {};
    const colorByToken: Record<string, PlayerColor> = {};
    players.forEach((p) => p.tokens.forEach((t) => {
      truePositions[t.id] = t.position;
      colorByToken[t.id] = t.color;
    }));

    const prev = truePositionsRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let pendingHops = 0;
    // Whether ANY token actually changed position this update - as opposed
    // to a re-render with the same positions (e.g. a room:update that
    // didn't touch tokens). Only changes need to eventually fire the
    // completion callback.
    let anyChange = false;
    const newFlashes: CaptureFlash[] = [];

    const startHop = (tokenId: string, from: number, to: number) => {
      pendingHops++;
      let step = from;
      const advance = () => {
        step++;
        setDisplayPositions((cur) => ({ ...cur, [tokenId]: step }));
        if (step < to) {
          timers.push(setTimeout(advance, STEP_DURATION_MS));
        } else {
          pendingHops--;
          if (pendingHops === 0) onCompleteRef.current?.();
        }
      };
      timers.push(setTimeout(advance, STEP_DURATION_MS));
    };

    Object.keys(truePositions).forEach((tokenId) => {
      const oldPos = prev[tokenId];
      const newPos = truePositions[tokenId];
      if (oldPos === newPos) return;
      anyChange = true;

      if (oldPos === "YARD" && typeof newPos === "number") {
        // Pop onto the board at the entry square, then hop any remaining
        // steps one at a time if the roll carried them further in.
        setDisplayPositions((cur) => ({ ...cur, [tokenId]: 0 }));
        if (newPos > 0) startHop(tokenId, 0, newPos);
        return;
      }

      if (typeof oldPos === "number" && typeof newPos === "number" && newPos > oldPos) {
        startHop(tokenId, oldPos, newPos);
        return;
      }

      // Sent back to the yard by an opponent landing on this square - the
      // only other way a token's position can change. Flash a brief burst
      // at the square it was captured on before it disappears, and let the
      // parent page know (toast/sound) via onCapture.
      if (typeof oldPos === "number" && newPos === "YARD") {
        const color = colorByToken[tokenId];
        const coord = getRenderCoord(color, oldPos, 0);
        flashSeqRef.current += 1;
        newFlashes.push({ key: `${tokenId}-${flashSeqRef.current}`, color, row: coord.row, col: coord.col });
        onCaptureRef.current?.({ tokenId, color });
      }

      setDisplayPositions((cur) => ({ ...cur, [tokenId]: newPos }));
    });

    if (newFlashes.length > 0) {
      setCaptureFlashes((cur) => [...cur, ...newFlashes]);
      const flashKeys = newFlashes.map((f) => f.key);
      timers.push(
        setTimeout(() => {
          setCaptureFlashes((cur) => cur.filter((f) => !flashKeys.includes(f.key)));
        }, CAPTURE_FLASH_MS)
      );
    }

    truePositionsRef.current = truePositions;

    // Something moved (e.g. a token exited straight onto its entry square,
    // or got captured back to the yard) but none of it needed a multi-step
    // hop, so `startHop` never ran and never fired the completion callback.
    // The dice overlay is still waiting on it - fire it now, next tick, so
    // "Counting..." doesn't get stuck forever.
    if (anyChange && pendingHops === 0) {
      timers.push(setTimeout(() => onCompleteRef.current?.(), 0));
    }

    return () => timers.forEach(clearTimeout);
  }, [players]);

  const tokensByCell = useMemo(() => {
    const grouped: Record<string, { id: string; color: PlayerColor }[]> = {};
    players.forEach((player) => {
      player.tokens.forEach((token, index) => {
        const pos = displayPositions[token.id] ?? token.position;
        const coord = getRenderCoord(token.color, pos, index);
        const key = `${coord.row},${coord.col}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ id: token.id, color: token.color });
      });
    });
    return grouped;
  }, [players, displayPositions]);

  return (
    <div
      dir="ltr"
      className="relative isolate grid w-full aspect-square border-[5px] border-slate-900 rounded-2xl bg-white mx-auto shadow-2xl overflow-hidden"
      style={{ gridTemplateColumns: "repeat(15, 1fr)", gridTemplateRows: "repeat(15, 1fr)" }}
    >
      {/* One clean border per color box, plus an avatar badge sitting in
          the yard's free center gap. Positioned absolutely (NOT as grid
          items) so neither ever interferes with the other 225 cells'
          auto-placement in the grid. Deliberately drawn at a LOWER
          z-index than the token cells below, so tokens always render on
          top of the photo instead of the photo covering them. */}
      {ALL_COLORS.map((color) => {
        const { rowStart, colStart } = BASE_ZONE[color];
        const name = playerNames?.[color] ?? color.charAt(0) + color.slice(1).toLowerCase();
        const avatarUrl = playerAvatars?.[color];
        const isEmpty = emptyColors?.has(color) ?? false;
        const isDisconnected = disconnectedColors?.has(color) ?? false;
        const isCurrentTurn = currentTurnColors?.has(color) ?? false;
        return (
          <div key={`zone-${color}`}>
            <div
              className="absolute z-20 pointer-events-none border-[3px] border-slate-900"
              style={{
                top: `${(rowStart / 15) * 100}%`,
                left: `${(colStart / 15) * 100}%`,
                width: `${(6 / 15) * 100}%`,
                height: `${(6 / 15) * 100}%`,
              }}
            />
            {/* Photo badge - sits BEHIND the token cells (z-[5] vs the
                cells' z-10) so the 4 tokens always sit visibly on top of
                it instead of the photo covering them. */}
            <div
              className="absolute z-[5] pointer-events-none flex items-center justify-center"
              style={{
                top: `${((rowStart + 1) / 15) * 100}%`,
                left: `${((colStart + 1) / 15) * 100}%`,
                width: `${(4 / 15) * 100}%`,
                height: `${(4 / 15) * 100}%`,
              }}
            >
              {isEmpty ? (
                <div className="w-[75%] h-[75%] rounded-full border-[3px] border-dashed border-white/60 bg-black/20 flex items-center justify-center">
                  <span className="text-white/70 font-black" style={{ fontSize: "min(6vw, 24px)" }}>+</span>
                </div>
              ) : (
                <div
                  className={[
                    "relative w-[75%] h-[75%] rounded-full overflow-hidden flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.5)] border-[3px] border-white/95 transition-all",
                    isCurrentTurn ? "ring-4 ring-amber-300 shadow-[0_0_16px_4px_rgba(251,191,36,0.65)]" : "",
                    isDisconnected ? "opacity-40 grayscale" : "",
                  ].join(" ")}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full ${COLOR_BG_SOLID[color]} flex items-center justify-center text-white font-black`} style={{ fontSize: "min(6vw, 26px)" }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Center arrowhead pinwheel, sized to exactly cover the 3x3 middle block */}
      <div
        className="absolute z-0 pointer-events-none"
        style={{ top: "40%", left: "40%", width: "20%", height: "20%" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full block">
          <polygon points="0,0 100,0 50,50" className={`fill-current ${COLOR_TEXT_SOLID.GREEN}`} />
          <polygon points="100,0 100,100 50,50" className={`fill-current ${COLOR_TEXT_SOLID.YELLOW}`} />
          <polygon points="100,100 0,100 50,50" className={`fill-current ${COLOR_TEXT_SOLID.BLUE}`} />
          <polygon points="0,100 0,0 50,50" className={`fill-current ${COLOR_TEXT_SOLID.RED}`} />
          <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="2" />
          <line x1="100" y1="0" x2="0" y2="100" stroke="white" strokeWidth="2" />
        </svg>
      </div>

      {Array.from({ length: 15 }).map((_, r) =>
        Array.from({ length: 15 }).map((__, c) => {
          const key = `${r},${c}`;
          const cell = CELL_MAP[key];
          const tokensHere = tokensByCell[key] || [];
          const inArrowZone = r >= 6 && r <= 8 && c >= 6 && c <= 8;

          let bg = "bg-white";
          if (cell.type === "base") bg = COLOR_BG_SOLID[cell.color!];
          if (cell.type === "home") bg = COLOR_BG_SOLID[cell.color!];
          if (cell.type === "path" && cell.entryColor) bg = COLOR_BG_SOLID[cell.entryColor];
          if (inArrowZone) bg = "bg-transparent";
          const showGridLine = cell.type !== "base" && !inArrowZone;

          // Which home-stretch cell (of the 6) gets the inward direction
          // arrow hint - the 3rd cell, roughly the middle of the lane.
          const homeStretchIdx = cell.type === "home" ? HOME_STRETCH_COORDS[cell.color!].findIndex(
            (coord) => coord.row === r && coord.col === c
          ) : -1;

          return (
            <div
              key={key}
              // Explicit placement instead of relying on DOM-order
              // auto-flow - auto-placement direction can silently mirror
              // (e.g. under an inherited RTL context), which would offset
              // every cell from the absolutely-positioned badges above
              // without either one "looking broken" on its own.
              style={{ gridColumn: c + 1, gridRow: r + 1 }}
              className={`relative z-10 flex items-center justify-center ${bg} ${
                showGridLine ? "border border-slate-300" : ""
              }`}
            >
              {cell.type === "path" && cell.safe && (
                <span
                  className={`absolute drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] ${
                    cell.entryColor ? "text-white" : "text-amber-500"
                  }`}
                  style={{ fontSize: "min(3.4vw, 16px)" }}
                >
                  ★
                </span>
              )}

              {homeStretchIdx === 2 && (
                <span className="text-white/80 font-black pointer-events-none" style={{ fontSize: "min(2.6vw, 13px)" }}>
                  {HOME_STRETCH_ARROW[cell.color!]}
                </span>
              )}

              {/* Decorative empty holder ring - only drawn on a marked
                  pip slot with nothing currently sitting on it, so a
                  yard never looks like a flat block of color even before
                  any tokens are visually distinguishable from the
                  background. */}
              {cell.pipSlot && tokensHere.length === 0 && (
                <div className="absolute w-[70%] h-[70%] rounded-full border-[3px] border-white/70 bg-black/10 pointer-events-none" />
              )}

              <div className="absolute inset-0">
                {tokensHere.map((t, i) => {
                  const stackSize = Math.min(tokensHere.length, 4);
                  const offset = STACK_OFFSETS[stackSize]?.[i] ?? { x: 0, y: 0 };
                  return (
                    <div
                      key={t.id}
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ transform: `translate(${offset.x}%, ${offset.y}%)`, zIndex: i + 1 }}
                    >
                      <Token
                        color={t.color}
                        selectable={selectableTokenIds.has(t.id)}
                        onClick={() => onTokenClick(t.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Capture bursts - a brief ring pulse at the square a token was
          just sent home from, on top of everything else. */}
      {captureFlashes.map((flash) => (
        <div
          key={flash.key}
          className="absolute z-40 pointer-events-none flex items-center justify-center"
          style={{
            top: `${(flash.row / 15) * 100}%`,
            left: `${(flash.col / 15) * 100}%`,
            width: `${(1 / 15) * 100}%`,
            height: `${(1 / 15) * 100}%`,
          }}
        >
          <div className="capture-burst absolute inset-[-60%] rounded-full border-4 border-red-500" />
          <span className="capture-burst-mark text-red-600 font-black" style={{ fontSize: "min(4vw, 20px)" }}>
            ✕
          </span>
        </div>
      ))}

      <style jsx>{`
        .capture-burst {
          animation: capture-burst-ring ${CAPTURE_FLASH_MS}ms ease-out forwards;
        }
        .capture-burst-mark {
          animation: capture-burst-mark ${CAPTURE_FLASH_MS}ms ease-out forwards;
        }
        @keyframes capture-burst-ring {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes capture-burst-mark {
          0% { transform: scale(0.5); opacity: 0; }
          30% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
