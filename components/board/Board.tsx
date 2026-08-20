"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerColor, ALL_COLORS } from "@/lib/engine";
import { BASE_ZONE, BASE_COORDS, GLOBAL_PATH_COORDS, HOME_STRETCH_COORDS, CENTER_COORD, ENTRY_COORDS, COLOR_BG_SOLID, getSafeCoordSet, getRenderCoord } from "@/lib/engine/layout";
import Token from "./Token";

const BOARD_SIZE = 15;
const STEP_DURATION_MS = 180;
const STACK_OFFSETS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -14, y: -14 }, { x: 14, y: 14 }],
  3: [{ x: -14, y: -14 }, { x: 14, y: -14 }, { x: 0, y: 14 }],
  4: [{ x: -14, y: -14 }, { x: 14, y: -14 }, { x: -14, y: 14 }, { x: 14, y: 14 }],
};

const HOME_ARROW: Record<PlayerColor, string> = { RED: "↑", GREEN: "↓", YELLOW: "←", BLUE: "→" };
const CLOCKWISE_ARROWS: Record<string, string> = {
  "1,6": "↑", "3,6": "↑", "5,6": "↑",
  "0,8": "→", "0,10": "→", "0,12": "→",
  "8,14": "↓", "10,14": "↓", "12,14": "↓",
  "14,6": "←", "14,8": "←", "14,10": "←",
  "6,0": "↑", "8,0": "↑",
};

type Pos = number | "YARD";
type CellType = "yard" | "path" | "home" | "center" | "empty";
interface Cell { type: CellType; color?: PlayerColor; safe?: boolean; entryColor?: PlayerColor; yardSlot?: boolean; homeIndex?: number }
interface BoardProps {
  players: Player[];
  selectableTokenIds: Set<string>;
  onTokenClick: (id: string) => void;
  onMoveAnimationComplete?: () => void;
  playerNames?: Partial<Record<PlayerColor, string>>;
  playerAvatars?: Partial<Record<PlayerColor, string | undefined>>;
  emptyColors?: Set<PlayerColor>;
  disconnectedColors?: Set<PlayerColor>;
  currentTurnColors?: Set<PlayerColor>;
  onCapture?: (info: { tokenId: string; color: PlayerColor }) => void;
  showTapHint?: boolean;
}
interface Flash { id: string; color: PlayerColor; row: number; col: number }
const key = (r: number, c: number) => `${r},${c}`;

function buildBoard() {
  const cells: Record<string, Cell> = {};
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) cells[key(r, c)] = { type: "empty" };
  for (const color of ALL_COLORS) {
    const z = BASE_ZONE[color];
    for (let r = z.rowStart; r < z.rowStart + 6; r++) for (let c = z.colStart; c < z.colStart + 6; c++) cells[key(r, c)] = { type: "yard", color };
    BASE_COORDS[color].forEach((p) => { cells[key(p.row, p.col)] = { type: "yard", color, yardSlot: true }; });
  }
  const safe = getSafeCoordSet();
  GLOBAL_PATH_COORDS.forEach((p) => { cells[key(p.row, p.col)] = { type: "path", safe: safe.has(key(p.row, p.col)) }; });
  for (const color of ALL_COLORS) {
    const e = ENTRY_COORDS[color];
    cells[key(e.row, e.col)] = { ...cells[key(e.row, e.col)], entryColor: color };
    HOME_STRETCH_COORDS[color].forEach((p, i) => { cells[key(p.row, p.col)] = { type: "home", color, homeIndex: i }; });
  }
  cells[key(CENTER_COORD.row, CENTER_COORD.col)] = { type: "center" };
  return cells;
}
const BOARD_CELLS = buildBoard();

function BoardToken({ color, position, selectable, offset, onClick }: { id: string; color: PlayerColor; position: Pos; selectable: boolean; offset: { x: number; y: number }; onClick: () => void }) {
  return <div className="absolute inset-0 z-20 pointer-events-none" style={{ transform: `translate(${offset.x}%,${offset.y}%)` }}><div className="relative h-full w-full pointer-events-none"><Token color={color} resting={position === "YARD"} selectable={selectable} onClick={onClick} /></div></div>;
}

function AvatarCluster({ color, name, avatar, empty, disconnected, turn }: { color: PlayerColor; name: string; avatar?: string; empty: boolean; disconnected: boolean; turn: boolean }) {
  return (
    <div className="absolute z-[12] pointer-events-none flex items-center justify-center" style={{ top: `${((BASE_ZONE[color].rowStart + 2.35) / BOARD_SIZE) * 100}%`, left: `${((BASE_ZONE[color].colStart + 2.35) / BOARD_SIZE) * 100}%`, width: `${(1.3 / BOARD_SIZE) * 100}%`, height: `${(1.3 / BOARD_SIZE) * 100}%` }}>
      <div className={`relative flex items-center justify-center w-full h-full rounded-full border-2 border-white/80 bg-black/15 shadow-lg ${turn ? "ring-2 ring-amber-300" : ""} ${disconnected ? "grayscale opacity-50" : ""}`}>
        <div className="absolute -left-[42%] top-[8%] w-[55%] aspect-square rounded-full bg-white/80 border border-black/20 flex items-center justify-center text-[clamp(8px,2vw,18px)]">🧑🏽</div>
        <div className="absolute -right-[42%] top-[8%] w-[55%] aspect-square rounded-full bg-white/80 border border-black/20 flex items-center justify-center text-[clamp(8px,2vw,18px)]">👩🏽</div>
        <div className="relative w-[72%] aspect-square rounded-full overflow-hidden border-2 border-white bg-black/20 flex items-center justify-center text-white font-black text-[clamp(8px,2.2vw,18px)]">
          {empty ? "+" : avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
}

export default function Board({ players, selectableTokenIds, onTokenClick, onMoveAnimationComplete, playerNames, playerAvatars, emptyColors, disconnectedColors, currentTurnColors, onCapture, showTapHint = false }: BoardProps) {
  const [displayPositions, setDisplayPositions] = useState<Record<string, Pos>>(() => {
    const x: Record<string, Pos> = {};
    players.forEach((p) => p.tokens.forEach((t) => { x[t.id] = t.position; }));
    return x;
  });
  const previous = useRef(displayPositions);
  const complete = useRef(onMoveAnimationComplete);
  const capture = useRef(onCapture);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const flashId = useRef(0);

  useEffect(() => { complete.current = onMoveAnimationComplete; }, [onMoveAnimationComplete]);
  useEffect(() => { capture.current = onCapture; }, [onCapture]);

  useEffect(() => {
    const next: Record<string, Pos> = {};
    const colors: Record<string, PlayerColor> = {};
    players.forEach((p) => p.tokens.forEach((t) => { next[t.id] = t.position; colors[t.id] = t.color; }));
    const prev = previous.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let animations = 0;
    let changed = false;
    const finish = () => { animations--; if (animations === 0) complete.current?.(); };
    const animate = (id: string, from: number, to: number) => {
      animations++;
      let step = from;
      const tick = () => { step++; setDisplayPositions((cur) => ({ ...cur, [id]: step })); if (step < to) timers.push(setTimeout(tick, STEP_DURATION_MS)); else finish(); };
      timers.push(setTimeout(tick, STEP_DURATION_MS));
    };
    const nf: Flash[] = [];
    Object.entries(next).forEach(([id, np]) => {
      const op = prev[id];
      if (op === np) return;
      changed = true;
      if (op === "YARD" && typeof np === "number") { setDisplayPositions((cur) => ({ ...cur, [id]: 0 })); if (np !== 0) animate(id, 0, np); return; }
      if (typeof op === "number" && typeof np === "number" && np > op) { animate(id, op, np); return; }
      if (typeof op === "number" && np === "YARD") {
        const color = colors[id], coord = getRenderCoord(color, op, 0);
        flashId.current++; nf.push({ id: `${id}-${flashId.current}`, color, row: coord.row, col: coord.col });
        capture.current?.({ tokenId: id, color });
      }
      setDisplayPositions((cur) => ({ ...cur, [id]: np }));
    });
    previous.current = next;
    if (nf.length) {
      setFlashes((cur) => [...cur, ...nf]);
      const ids = new Set(nf.map((f) => f.id));
      timers.push(setTimeout(() => setFlashes((cur) => cur.filter((f) => !ids.has(f.id))), 650));
    }
    if (changed && animations === 0) timers.push(setTimeout(() => complete.current?.(), 0));
    return () => timers.forEach(clearTimeout);
  }, [players]);

  const tokensByCell = useMemo(() => {
    const g: Record<string, { id: string; color: PlayerColor; position: Pos }[]> = {};
    players.forEach((p) => p.tokens.forEach((t, i) => {
      const position = displayPositions[t.id] ?? t.position;
      const coord = getRenderCoord(t.color, position, i);
      const k = key(coord.row, coord.col);
      (g[k] ??= []).push({ id: t.id, color: t.color, position });
    }));
    return g;
  }, [players, displayPositions]);

  const hint = useMemo(() => {
    const id = Array.from(selectableTokenIds)[0];
    if (!id) return null;
    for (const p of players) {
      const t = p.tokens.find((x) => x.id === id);
      if (t) return getRenderCoord(t.color, displayPositions[id] ?? t.position, 0);
    }
    return null;
  }, [selectableTokenIds, players, displayPositions]);

  return (
    <div dir="ltr" className="relative isolate grid w-full max-w-[720px] aspect-square mx-auto overflow-hidden rounded-[18px] border-[5px] border-slate-950 bg-white shadow-2xl" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE},minmax(0,1fr))`, gridTemplateRows: `repeat(${BOARD_SIZE},minmax(0,1fr))` }} aria-label="Ludo board">
      {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => {
        const row = Math.floor(i / BOARD_SIZE), col = i % BOARD_SIZE;
        const cell = BOARD_CELLS[key(row, col)];
        const tokens = tokensByCell[key(row, col)] || [];
        const center = row >= 6 && row <= 8 && col >= 6 && col <= 8;
        const isCenter = row === CENTER_COORD.row && col === CENTER_COORD.col;
        const isHome = cell.type === "home";
        const homeIndex = cell.homeIndex ?? -1;
        const bg = cell.type === "yard" || isHome ? COLOR_BG_SOLID[cell.color!] : cell.type === "path" && cell.entryColor ? COLOR_BG_SOLID[cell.entryColor] : "bg-white";
        const clockwise = CLOCKWISE_ARROWS[key(row, col)];
        return (
          <div key={key(row, col)} style={{ gridRow: row + 1, gridColumn: col + 1 }} className={`relative flex items-center justify-center ${center ? "bg-transparent" : bg} ${cell.type !== "yard" && !center ? "border border-slate-300" : ""}`}>
            {cell.yardSlot && tokens.length === 0 && <div className="absolute w-[72%] h-[72%] rounded-full border-[3px] border-white/75 bg-black/10 shadow-inner" />}
            {cell.type === "path" && cell.safe && <span className="absolute font-black text-amber-500 z-[1]" style={{ fontSize: "min(3.5vw,17px)" }}>★</span>}
            {clockwise && <span className="absolute z-[2] text-slate-800/75 font-black pointer-events-none" style={{ fontSize: "min(3vw,15px)" }}>{clockwise}</span>}
            {isHome && homeIndex === 2 && <span className="absolute z-[2] text-white/85 font-black pointer-events-none" style={{ fontSize: "min(3vw,15px)" }}>{HOME_ARROW[cell.color!]}</span>}
            {tokens.map((t, j) => {
              const n = Math.min(tokens.length, 4);
              const raw = STACK_OFFSETS[n]?.[j] ?? { x: 0, y: 0 };
              const offset = t.position === "YARD" ? { x: 0, y: 0 } : raw;
              return <BoardToken key={t.id} id={t.id} color={t.color} position={t.position} selectable={selectableTokenIds.has(t.id)} offset={offset} onClick={() => onTokenClick(t.id)} />;
            })}
            {isCenter && <div className="absolute inset-0 z-[3] overflow-hidden">
              <div className={`${COLOR_BG_SOLID.GREEN} absolute inset-0`} style={{ clipPath: "polygon(0 0,100% 0,50% 50%)" }} />
              <div className={`${COLOR_BG_SOLID.YELLOW} absolute inset-0`} style={{ clipPath: "polygon(100% 0,100% 100%,50% 50%)" }} />
              <div className={`${COLOR_BG_SOLID.BLUE} absolute inset-0`} style={{ clipPath: "polygon(100% 100%,0 100%,50% 50%)" }} />
              <div className={`${COLOR_BG_SOLID.RED} absolute inset-0`} style={{ clipPath: "polygon(0 100%,0 0,50% 50%)" }} />
              {isCenter && <div className="absolute inset-[14%] rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 border-[3px] border-white/50 shadow-xl flex items-center justify-center"><span className="text-white font-black tracking-tight text-[clamp(9px,3.8vw,22px)] drop-shadow-[0_2px_1px_rgba(0,0,0,.45)]">LUDO</span></div>}
            </div>}
          </div>
        );
      })}

      {ALL_COLORS.map((color) => {
        const name = playerNames?.[color] ?? color.toLowerCase();
        const avatar = playerAvatars?.[color];
        const empty = emptyColors?.has(color) ?? false;
        const disconnected = disconnectedColors?.has(color) ?? false;
        const turn = currentTurnColors?.has(color) ?? false;
        return <AvatarCluster key={color} color={color} name={name} avatar={avatar} empty={empty} disconnected={disconnected} turn={turn} />;
      })}

      {ALL_COLORS.map((color) => {
        const z = BASE_ZONE[color];
        const name = playerNames?.[color] ?? color.toLowerCase();
        return <div key={`label-${color}`} className="absolute z-[14] pointer-events-none font-black text-white drop-shadow-[0_2px_1px_rgba(0,0,0,.65)]" style={{ top: `${((z.rowStart + 0.05) / BOARD_SIZE) * 100}%`, left: `${((z.colStart + 1.55) / BOARD_SIZE) * 100}%`, fontSize: "clamp(9px,2.8vw,18px)" }}>{name}</div>;
      })}

      {showTapHint && hint && <div className="absolute z-[50] pointer-events-none" style={{ top: `${((hint.row + .5) / BOARD_SIZE) * 100}%`, left: `${((hint.col + .5) / BOARD_SIZE) * 100}%` }}><div className="text-4xl leading-none drop-shadow-xl animate-[tapHint_1.4s_ease-in-out_infinite]">👆</div></div>}
      {flashes.map((f) => <div key={f.id} className="absolute z-[30] pointer-events-none" style={{ top: `${((f.row + .5) / BOARD_SIZE) * 100}%`, left: `${((f.col + .5) / BOARD_SIZE) * 100}%`, transform: "translate(-50%,-50%)" }}><div className={`w-10 h-10 rounded-full ${COLOR_BG_SOLID[f.color]} animate-ping opacity-80`} /></div>)}
      <style jsx>{`@keyframes tapHint{0%,100%{transform:translate(-12%,-8%) scale(1)}45%{transform:translate(-12%,10%) scale(.88)}60%{transform:translate(-12%,-8%) scale(1)}}`}</style>
    </div>
  );
}
