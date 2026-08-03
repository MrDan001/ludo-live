// Board UI component
"use client";

import { useMemo } from "react";
import { Player, PlayerColor, ALL_COLORS } from "@/lib/engine";
import {
  BASE_ZONE,
  DECO_CORNERS,
  GLOBAL_PATH_COORDS,
  HOME_STRETCH_COORDS,
  CENTER_COORD,
  COLOR_BG,
  COLOR_BG_LIGHT,
  getSafeCoordSet,
  getRenderCoord,
} from "@/lib/engine/layout";
import Token from "./Token";

type CellType = "base" | "path" | "home" | "center" | "deco" | "empty";

interface CellInfo {
  type: CellType;
  color?: PlayerColor;
  safe?: boolean;
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
    HOME_STRETCH_COORDS[color].forEach((coord) => {
      map[`${coord.row},${coord.col}`] = { type: "home", color };
    });
  });

  map[`${CENTER_COORD.row},${CENTER_COORD.col}`] = { type: "center" };
  DECO_CORNERS.forEach((coord) => {
    map[`${coord.row},${coord.col}`] = { type: "deco" };
  });

  return map;
}

const CELL_MAP = buildCellMap();

interface BoardProps {
  players: Player[];
  selectableTokenIds: Set<string>;
  onTokenClick: (tokenId: string) => void;
}

export default function Board({ players, selectableTokenIds, onTokenClick }: BoardProps) {
  const tokensByCell = useMemo(() => {
    const grouped: Record<string, { id: string; color: PlayerColor }[]> = {};
    players.forEach((player) => {
      player.tokens.forEach((token, index) => {
        const coord = getRenderCoord(token.color, token.position, index);
        const key = `${coord.row},${coord.col}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ id: token.id, color: token.color });
      });
    });
    return grouped;
  }, [players]);

  return (
    <div
  className="grid w-full max-w-[600px] aspect-square border-4 border-slate-900 rounded-xl bg-white mx-auto shadow-2xl overflow-hidden"
  style={{ gridTemplateColumns: "repeat(15, 1fr)", gridTemplateRows: "repeat(15, 1fr)" }}
>
      {Array.from({ length: 15 }).map((_, r) =>
        Array.from({ length: 15 }).map((__, c) => {
          const key = `${r},${c}`;
          const cell = CELL_MAP[key];
          const tokensHere = tokensByCell[key] || [];

          let bg = "bg-white";
          if (cell.type === "base") bg = COLOR_BG_LIGHT[cell.color!];
          if (cell.type === "home") bg = COLOR_BG_LIGHT[cell.color!];
          if (cell.type === "center") bg = "bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400";
          if (cell.type === "deco") bg = "bg-slate-100";
          return (
            <div
              key={key}
              className={`relative border border-slate-200 flex items-center justify-center ${bg}`}
            >
              {cell.type === "path" && cell.safe && (
  <span className="text-sm text-amber-500 drop-shadow-sm">★</span>
)}
              <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-[1px] p-[1px]">
                {tokensHere.map((t) => (
                  <Token
                    key={t.id}
                    color={t.color}
                    selectable={selectableTokenIds.has(t.id)}
                    onClick={() => onTokenClick(t.id)}
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