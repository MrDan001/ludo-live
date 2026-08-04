// Board UI component
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerColor, ALL_COLORS } from "@/lib/engine";
import {
  BASE_ZONE,
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
}

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
}

export default function Board({ players, selectableTokenIds, onTokenClick, onMoveAnimationComplete }: BoardProps) {
  const [displayPositions, setDisplayPositions] = useState<Record<string, Pos>>(() => {
    const initial: Record<string, Pos> = {};
    players.forEach((p) => p.tokens.forEach((t) => { initial[t.id] = t.position; }));
    return initial;
  });

  // Tracks the last *true* (server) position we diffed against - kept
  // separate from displayPositions so an in-flight hop animation doesn't
  // get confused with the authoritative game state driving it.
  const truePositionsRef = useRef<Record<string, Pos>>(displayPositions);
  const onCompleteRef = useRef(onMoveAnimationComplete);

  useEffect(() => {
    onCompleteRef.current = onMoveAnimationComplete;
  }, [onMoveAnimationComplete]);

  useEffect(() => {
    const truePositions: Record<string, Pos> = {};
    players.forEach((p) => p.tokens.forEach((t) => { truePositions[t.id] = t.position; }));

    const prev = truePositionsRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let pendingHops = 0;

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

      // Captured back to the yard (or any other non-forward transition) -
      // there's no path to walk backward along, so place it directly.
      setDisplayPositions((cur) => ({ ...cur, [tokenId]: newPos }));
    });

    truePositionsRef.current = truePositions;

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  className="relative isolate grid w-full max-w-[600px] aspect-square border-4 border-slate-900 rounded-xl bg-white mx-auto shadow-2xl overflow-hidden"
  style={{ gridTemplateColumns: "repeat(15, 1fr)", gridTemplateRows: "repeat(15, 1fr)" }}
>
      {/* One clean border per color box. Positioned absolutely (NOT as grid items) so it
          can never interfere with the other 225 cells' auto-placement in the grid. */}
      {ALL_COLORS.map((color) => {
        const { rowStart, colStart } = BASE_ZONE[color];
        return (
          <div
            key={`zone-border-${color}`}
            className="absolute z-20 pointer-events-none border-[3px] border-slate-900"
            style={{
              top: `${(rowStart / 15) * 100}%`,
              left: `${(colStart / 15) * 100}%`,
              width: `${(6 / 15) * 100}%`,
              height: `${(6 / 15) * 100}%`,
            }}
          />
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

          return (
            <div
              key={key}
              className={`relative z-10 flex items-center justify-center ${bg} ${
                showGridLine ? "border border-slate-200" : ""
              }`}
            >
              {cell.type === "path" && cell.safe && (
  <span className={`text-sm drop-shadow-sm ${cell.entryColor ? "text-white" : "text-amber-500"}`}>★</span>
)}
              <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-[1px] p-0">
                {tokensHere.map((t) => (
                  <Token
                    key={t.id}
                    color={t.color}
                    selectable={selectableTokenIds.has(t.id)}
                    onClick={() => onTokenClick(t.id)}
                    stackSize={tokensHere.length}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}