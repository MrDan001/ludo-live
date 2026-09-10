"use client";

import React, { useMemo } from "react";
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

const FINISH_STACK_OFFSETS: Point[] = [
  { left: "31%", top: "31%" },
  { left: "69%", top: "31%" },
  { left: "31%", top: "69%" },
  { left: "69%", top: "69%" },
];

const keyOf = (token: DemoToken) => `${token.color}:${token.id}`;
const cellKey = (token: DemoToken) => {
  const position = Number(token.position);
  const state = tokenState(position);
  if (state === "yard" || state === "finished") return `${state}:${token.color}`;
  const cell = getTokenCell(token.color, position);
  return cell ? `${cell[0]}:${cell[1]}` : `${state}:${token.color}:${position}`;
};

function percentPoint(token: DemoToken): Point | null {
  const position = Number(token.position);
  if (position <= 0) {
    const center = YARD_CENTERS[token.color]?.[token.id] ?? YARD_CENTERS[token.color]?.[0];
    if (!center) return null;
    return { left: `${center[1]}%`, top: `${center[0]}%` };
  }
  if (position === FINISH_PROGRESS) return null;
  const cell = getTokenCell(token.color, position);
  if (!cell) return null;
  return { left: `${((cell[1] + 0.5) * 100) / 15}%`, top: `${((cell[0] + 0.5) * 100) / 15}%` };
}

function grouped<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    const current = map.get(key) ?? [];
    current.push(item);
    map.set(key, current);
  });
  return map;
}

export default function LudoWorldBoard({ theme = "classic", demoTokens, legalTokenKeys = [], onTokenClick }: Props) {
  const palette = BOARD_PALETTES[theme] ?? BOARD_PALETTES.classic;
  const legal = useMemo(() => new Set(legalTokenKeys), [legalTokenKeys]);
  const tokens = useMemo(() => {
    return demoTokens.map((token) => ({ ...token, position: Number(token.position), state: tokenState(Number(token.position)) as DemoToken["state"] }));
  }, [demoTokens]);

  const yardTokens = tokens.filter((token) => tokenState(token.position) === "yard");
  const activeTokens = tokens.filter((token) => tokenState(token.position) === "track" || (tokenState(token.position) === "home" && token.position >= HOME_START_PROGRESS && token.position < FINISH_PROGRESS));
  const finishedByColor = useMemo(() => {
    const map = new Map<Color, DemoToken[]>();
    COLORS.forEach((color) => map.set(color, []));
    tokens.filter((token) => token.position === FINISH_PROGRESS || token.state === "finished").forEach((token) => {
      map.get(token.color)?.push(token);
    });
    return map;
  }, [tokens]);

  const activeGroups = useMemo(() => grouped(activeTokens, cellKey), [activeTokens]);
  const hasFinished = [...finishedByColor.values()].some((list) => list.length > 0);

  const tokenButton = (token: DemoToken, point: Point, size = "5.4%", stackIndex = 0, stackTotal = 1) => {
    const tokenKey = keyOf(token);
    const isLegal = legal.has(tokenKey);
    const offset = stackTotal > 1
      ? [{ x: -0.16, y: -0.16 }, { x: 0.16, y: -0.16 }, { x: -0.16, y: 0.16 }, { x: 0.16, y: 0.16 }][Math.min(stackIndex, 3)]
      : { x: 0, y: 0 };
    return (
      <button
        key={`${tokenKey}-${stackIndex}`}
        type="button"
        aria-label={`${token.color} token ${token.id + 1}${isLegal ? " — legal move" : ""}`}
        onClick={() => onTokenClick?.(token.color, token.id)}
        className={`lw7-token ${isLegal ? "is-legal" : ""}`}
        style={{
          left: point.left,
          top: point.top,
          width: size,
          background: palette[token.color],
          transform: `translate(-50%, -50%) translate(${offset.x}em, ${offset.y}em)`,
        }}
      >
        {isLegal && <span className="lw7-pulse" style={{ borderColor: palette[token.color], boxShadow: `0 0 8px ${palette[token.color]}` }} />}
        <span className="lw7-token-number">{token.id + 1}</span>
      </button>
    );
  };

  return (
    <div className="lw7-board" style={{ "--lw7-accent": palette.accent } as React.CSSProperties}>
      <LudoBoard theme={theme} demoTokens={[]} style={{ width: "100%", height: "100%" }} />
      <div className="lw7-overlay" aria-label="Ludo World game board">
        {yardTokens.map((token) => {
          const point = percentPoint(token);
          return point ? tokenButton(token, point, "8.5%") : null;
        })}

        {[...activeGroups.entries()].flatMap(([, group]) => group.map((token, index) => {
          const point = percentPoint(token);
          return point ? tokenButton(token, point, "5.4%", index, group.length) : null;
        }))}

        {hasFinished && (
          <div className="lw7-finish-panel" aria-label="Finished token boxes">
            {COLORS.map((color) => {
              const bay = FINISH_BAYS[color];
              const colorTokens = finishedByColor.get(color) ?? [];
              return (
                <div
                  key={color}
                  className="lw7-finish-bay"
                  style={{
                    left: `${bay.left}%`,
                    top: `${bay.top}%`,
                    width: `${bay.width}%`,
                    height: `${bay.height}%`,
                    background: `${palette[color]}1f`,
                    borderColor: palette[color],
                  }}
                  aria-label={`${color} finished tokens`}
                >
                  {colorTokens.slice(0, 4).map((token, index) => {
                    const slot = FINISH_STACK_OFFSETS[index] ?? FINISH_STACK_OFFSETS[0];
                    const style: React.CSSProperties = {
                      left: slot.left,
                      top: slot.top,
                      width: "28%",
                      background: palette[color],
                    };
                    const isLegal = legal.has(keyOf(token));
                    return (
                      <button
                        key={`finish-${keyOf(token)}`}
                        type="button"
                        aria-label={`${color} finished token ${token.id + 1}`}
                        className={`lw7-token lw7-finish-token ${isLegal ? "is-legal" : ""}`}
                        style={style}
                        onClick={() => onTokenClick?.(token.color, token.id)}
                      >
                        {isLegal && <span className="lw7-pulse" style={{ borderColor: palette[color], boxShadow: `0 0 8px ${palette[color]}` }} />}
                        <span className="lw7-token-number">{token.id + 1}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="lw7-board-status">
        <span />
        <b>{hasFinished ? "Finished pieces stay boxed by color" : "Tap a pulsing token after you roll"}</b>
      </div>
    </div>
  );
}
