"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import LudoBoard, { BOARD_PALETTES, type BoardThemeId, type DemoToken } from "../_components/LudoBoard";
import { FINISH_PROGRESS, HOME_START_PROGRESS, TRACK_LENGTH, getTokenCell, tokenState } from "../../lib/canonicalLudoBoard";

export type { BoardThemeId, DemoToken };

type Props = {
  theme?: BoardThemeId;
  demoTokens: DemoToken[];
  legalTokenKeys?: string[];
  onTokenClick?: (color: DemoToken["color"], id: number) => void;
};
type Point = { left: string; top: string };
type Color = DemoToken["color"];

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const YARD_CENTERS: Record<Color, Array<[number, number]>> = {
  green: [[13.5, 13.5], [13.5, 26.5], [26.5, 13.5], [26.5, 26.5]],
  yellow: [[13.5, 73.5], [13.5, 86.5], [26.5, 73.5], [26.5, 86.5]],
  red: [[73.5, 13.5], [73.5, 26.5], [86.5, 13.5], [86.5, 26.5]],
  blue: [[73.5, 73.5], [73.5, 86.5], [86.5, 73.5], [86.5, 86.5]],
};
const FINISH_BAYS: Record<Color, { left: number; top: number; width: number; height: number }> = {
  red: { left: 39, top: 39, width: 10.5, height: 10.5 },
  yellow: { left: 50.5, top: 39, width: 10.5, height: 10.5 },
  green: { left: 39, top: 50.5, width: 10.5, height: 10.5 },
  blue: { left: 50.5, top: 50.5, width: 10.5, height: 10.5 },
};
const FINISH_SLOTS: Record<Color, Array<[number, number]>> = {
  red: [[31, 31], [69, 31], [31, 69], [69, 69]],
  yellow: [[31, 31], [69, 31], [31, 69], [69, 69]],
  green: [[31, 31], [69, 31], [31, 69], [69, 69]],
  blue: [[31, 31], [69, 31], [31, 69], [69, 69]],
};
const keyOf = (token: DemoToken) => `${token.color}:${token.id}`;
const normalize = (tokens: DemoToken[]) => {
  const map = new Map<string, DemoToken>();
  for (const token of tokens) {
    const next = { ...token, position: Number(token.position) || 0 } as DemoToken;
    const existing = map.get(keyOf(next));
    if (!existing || Number(next.position) >= Number(existing.position)) map.set(keyOf(next), next);
  }
  return [...map.values()];
};

function stateFor(position: number): DemoToken["state"] {
  return tokenState(position) as DemoToken["state"];
}

function pointFor(token: DemoToken): Point | null {
  const position = Number(token.position);
  if (position <= 0) {
    const center = YARD_CENTERS[token.color]?.[token.id] ?? YARD_CENTERS[token.color]?.[0];
    return center ? { left: `${center[1]}%`, top: `${center[0]}%` } : null;
  }
  if (position === FINISH_PROGRESS) return null;
  const cell = getTokenCell(token.color, position);
  return cell ? { left: `${((cell[1] + 0.5) * 100) / 15}%`, top: `${((cell[0] + 0.5) * 100) / 15}%` } : null;
}

function cellKey(token: DemoToken) {
  const position = Number(token.position);
  const state = stateFor(position);
  if (state === "yard" || state === "finished") return `${state}:${token.color}`;
  const cell = getTokenCell(token.color, position);
  return cell ? `${cell[0]}:${cell[1]}` : `${state}:${token.color}:${position}`;
}

function distanceState(token: DemoToken, target: number) {
  const from = Number(token.position);
  const direction = target >= from ? 1 : -1;
  return { from, direction };
}

export default function LudoWorldBoard({ theme = "classic", demoTokens, legalTokenKeys = [], onTokenClick }: Props) {
  const palette = BOARD_PALETTES[theme] ?? BOARD_PALETTES.classic;
  const incoming = useMemo(() => normalize(demoTokens), [demoTokens]);
  const [displayTokens, setDisplayTokens] = useState<DemoToken[]>(incoming);
  const displayRef = useRef(displayTokens);
  const timersRef = useRef<Record<string, number>>({});
  const mountedRef = useRef(false);

  useEffect(() => {
    displayRef.current = displayTokens;
  }, [displayTokens]);

  useEffect(() => {
    const current = new Map(displayRef.current.map((token) => [keyOf(token), token]));
    const nextMap = new Map(incoming.map((token) => [keyOf(token), token]));

    if (!mountedRef.current) {
      mountedRef.current = true;
      displayRef.current = incoming;
      setDisplayTokens(incoming);
      return;
    }

    const cancelTimer = (key: string) => {
      const timer = timersRef.current[key];
      if (timer) window.clearTimeout(timer);
      delete timersRef.current[key];
    };

    const commit = (key: string, token: DemoToken) => {
      const next = displayRef.current.map((item) => (keyOf(item) === key ? token : item));
      if (!next.some((item) => keyOf(item) === key)) next.push(token);
      displayRef.current = next;
      setDisplayTokens(next);
    };

    for (const [key, target] of nextMap) {
      const live = current.get(key);
      if (!live) {
        commit(key, target);
        continue;
      }
      const from = Number(live.position);
      const to = Number(target.position);
      if (from === to && live.state === target.state) continue;
      if (timersRef.current[key]) continue;

      if (target.state === "yard" && from > 0) {
        commit(key, { ...target, position: 0, state: "yard" });
        continue;
      }

      const { direction } = distanceState(live, to);
      const step = () => {
        const currentToken = displayRef.current.find((item) => keyOf(item) === key);
        if (!currentToken) {
          cancelTimer(key);
          return;
        }
        const currentPosition = Number(currentToken.position);
        if (currentPosition === to) {
          commit(key, target);
          cancelTimer(key);
          return;
        }
        const nextPosition = currentPosition + direction;
        const reached = direction > 0 ? nextPosition >= to : nextPosition <= to;
        const position = reached ? to : nextPosition;
        commit(key, { ...currentToken, position, state: stateFor(position) });
        if (reached) {
          commit(key, target);
          cancelTimer(key);
          return;
        }
        timersRef.current[key] = window.setTimeout(step, 220);
      };

      timersRef.current[key] = window.setTimeout(step, 30);
    }

    const reconciled = displayRef.current.filter((token) => nextMap.has(keyOf(token)));
    for (const token of incoming) {
      if (!reconciled.some((item) => keyOf(item) === keyOf(token))) reconciled.push(token);
    }
    displayRef.current = reconciled;
    setDisplayTokens(reconciled);
  }, [incoming]);

  useEffect(() => () => {
    Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const legalSet = useMemo(() => new Set(legalTokenKeys), [legalTokenKeys]);
  const yardTokens = useMemo(() => displayTokens.filter((token) => stateFor(Number(token.position)) === "yard"), [displayTokens]);
  const activeTokens = useMemo(
    () => displayTokens.filter((token) => {
      const position = Number(token.position);
      return (stateFor(position) === "track" && position >= 1 && position <= TRACK_LENGTH) || (stateFor(position) === "home" && position >= HOME_START_PROGRESS && position < FINISH_PROGRESS);
    }),
    [displayTokens]
  );
  const activeGroups = useMemo(() => {
    const map = new Map<string, DemoToken[]>();
    for (const token of activeTokens) {
      const key = cellKey(token);
      const list = map.get(key) ?? [];
      list.push(token);
      map.set(key, list);
    }
    return map;
  }, [activeTokens]);
  const finishedByColor = useMemo(() => {
    const map = new Map<Color, DemoToken[]>();
    COLORS.forEach((color) => map.set(color, []));
    displayTokens.filter((token) => Number(token.position) === FINISH_PROGRESS || token.state === "finished").forEach((token) => map.get(token.color)?.push(token));
    return map;
  }, [displayTokens]);

  const tokenButton = (token: DemoToken, point: Point, size: string, stackIndex = 0, stackTotal = 1) => {
    const legal = legalSet.has(keyOf(token));
    const offsets = [
      { x: -0.18, y: -0.18 },
      { x: 0.18, y: -0.18 },
      { x: -0.18, y: 0.18 },
      { x: 0.18, y: 0.18 },
    ];
    const offset = stackTotal > 1 ? offsets[Math.min(stackIndex, offsets.length - 1)] : { x: 0, y: 0 };
    return (
      <button
        key={`${keyOf(token)}-${stackIndex}`}
        type="button"
        aria-label={`${token.color} token${legal ? " — legal move" : ""}`}
        onClick={() => onTokenClick?.(token.color, token.id)}
        className={`lw7-token ${legal ? "is-legal" : ""}`}
        style={{
          left: point.left,
          top: point.top,
          width: size,
          background: palette[token.color],
          transform: `translate(-50%, -50%) translate(${offset.x}em, ${offset.y}em)`,
        }}
      >
        {legal && <span className="lw7-pulse" style={{ borderColor: palette[token.color], boxShadow: `0 0 8px ${palette[token.color]}` }} />}
      </button>
    );
  };

  return (
    <div className="lw7-board" style={{ "--lw7-accent": palette.accent } as React.CSSProperties}>
      <LudoBoard theme={theme} demoTokens={[]} style={{ width: "100%", height: "100%" }} />
      <div className="lw7-overlay" aria-label="Ludo World board tokens">
        {yardTokens.map((token) => {
          const point = pointFor(token);
          return point ? tokenButton(token, point, "8.5%") : null;
        })}
        {[...activeGroups.entries()].flatMap(([, group]) => group.map((token, index) => {
          const point = pointFor(token);
          return point ? tokenButton(token, point, "5.4%", index, group.length) : null;
        }))}
        <div className="lw7-finish-panel" aria-label="Finished token boxes">
          {COLORS.map((color) => {
            const bay = FINISH_BAYS[color];
            const colorTokens = (finishedByColor.get(color) ?? []).slice(0, 4);
            return (
              <div key={color} className="lw7-finish-bay" style={{ left: `${bay.left}%`, top: `${bay.top}%`, width: `${bay.width}%`, height: `${bay.height}%`, background: `${palette[color]}18`, borderColor: palette[color] }}>
                {colorTokens.map((token, index) => {
                  const slot = FINISH_SLOTS[color][index] ?? FINISH_SLOTS[color][0];
                  return <button key={`finish-${keyOf(token)}`} type="button" aria-label={`${color} finished token`} className="lw7-token lw7-finish-token" style={{ left: `${slot[0]}%`, top: `${slot[1]}%`, width: "27%", background: palette[color] }} onClick={() => onTokenClick?.(token.color, token.id)} />;
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="lw7-board-status"><span /><b>{legalTokenKeys.length ? "Tap a pulsing token after you roll" : "Ludo World match board"}</b></div>
    </div>
  );
}
