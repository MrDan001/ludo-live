"use client";

import React, { useMemo } from "react";
import LudoBoard, { BOARD_PALETTES, type BoardThemeId, type DemoToken } from "../_components/LudoBoard";
import { FINISH_PROGRESS, HOME_START_PROGRESS, getTokenCell, tokenState } from "../../lib/canonicalLudoBoard";

export type { BoardThemeId, DemoToken };

type Props = { theme?: BoardThemeId; demoTokens: DemoToken[]; legalTokenKeys?: string[]; onTokenClick?: (color: DemoToken["color"], id: number) => void };
type Color = DemoToken["color"];
type Point = { left: string; top: string };

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
const FINISH_SLOTS: Array<[number, number]> = [[31, 31], [69, 31], [31, 69], [69, 69]];
const STACK_OFFSETS = [{ x: -0.18, y: -0.18 }, { x: 0.18, y: -0.18 }, { x: -0.18, y: 0.18 }, { x: 0.18, y: 0.18 }];
const keyOf = (token: DemoToken) => `${token.color}:${token.id}`;

function pointFor(token: DemoToken): Point | null {
  const position = Number(token.position) || 0;
  const state = tokenState(position);
  if (state === "yard") {
    const center = YARD_CENTERS[token.color]?.[token.id] ?? YARD_CENTERS[token.color]?.[0];
    return center ? { left: `${center[1]}%`, top: `${center[0]}%` } : null;
  }
  if (state === "finished" || position === FINISH_PROGRESS) return null;
  const cell = getTokenCell(token.color, position);
  return cell ? { left: `${((cell[1] + 0.5) * 100) / 15}%`, top: `${((cell[0] + 0.5) * 100) / 15}%` } : null;
}

function cellKey(token: DemoToken) {
  const position = Number(token.position) || 0;
  const state = tokenState(position);
  if (state === "yard" || state === "finished") return `${state}:${token.color}`;
  const cell = getTokenCell(token.color, position);
  return cell ? `${cell[0]}:${cell[1]}` : `${state}:${token.color}:${position}`;
}

export default function LudoWorldBoard({ theme = "classic", demoTokens, legalTokenKeys = [], onTokenClick }: Props) {
  const palette = BOARD_PALETTES[theme] ?? BOARD_PALETTES.classic;
  const legal = useMemo(() => new Set(legalTokenKeys), [legalTokenKeys]);

  // Full renderer rebuild: the board is a pure view of the canonical token state.
  // There is no local token animation/state layer and no synthesized duplicate copy.
  const tokens = useMemo(() => {
    const map = new Map<string, DemoToken>();
    for (const incoming of demoTokens) {
      const token = { ...incoming, position: Number(incoming.position) || 0, state: tokenState(Number(incoming.position) || 0) as DemoToken["state"] };
      map.set(keyOf(token), token);
    }
    return Array.from(map.values());
  }, [demoTokens]);

  const yardTokens = useMemo(() => tokens.filter((token) => tokenState(token.position) === "yard"), [tokens]);
  const activeGroups = useMemo(() => {
    const groups = new Map<string, DemoToken[]>();
    for (const token of tokens) {
      const state = tokenState(token.position);
      if (state !== "track" && state !== "home") continue;
      const key = cellKey(token);
      const list = groups.get(key) ?? [];
      list.push(token);
      groups.set(key, list);
    }
    return groups;
  }, [tokens]);
  const finishedByColor = useMemo(() => {
    const result = new Map<Color, DemoToken[]>();
    COLORS.forEach((color) => result.set(color, []));
    for (const token of tokens) {
      if (tokenState(token.position) === "finished" && token.position === FINISH_PROGRESS) result.get(token.color)?.push(token);
    }
    return result;
  }, [tokens]);

  const renderToken = (token: DemoToken, point: Point, size: string, index = 0, total = 1) => {
    const isLegal = legal.has(keyOf(token));
    const offset = total > 1 ? STACK_OFFSETS[Math.min(index, STACK_OFFSETS.length - 1)] : { x: 0, y: 0 };
    return (
      <button key={`${keyOf(token)}:${index}`} type="button" aria-label={`${token.color} token${isLegal ? " — legal move" : ""}`} onClick={() => onTokenClick?.(token.color, token.id)} className={`lw7-token ${isLegal ? "is-legal" : ""}`} style={{ left: point.left, top: point.top, width: size, background: palette[token.color], transform: `translate(-50%, -50%) translate(${offset.x}em, ${offset.y}em)` }}>
        {isLegal && <span className="lw7-pulse" style={{ borderColor: palette[token.color], boxShadow: `0 0 8px ${palette[token.color]}` }} />}
      </button>
    );
  };

  return (
    <div className="lw7-board" style={{ "--lw7-accent": palette.accent } as React.CSSProperties}>
      <LudoBoard theme={theme} demoTokens={[]} style={{ width: "100%", height: "100%" }} />
      <div className="lw7-overlay" aria-label="Ludo World board tokens">
        {yardTokens.map((token) => {
          const point = pointFor(token);
          return point ? renderToken(token, point, "8.5%") : null;
        })}
        {[...activeGroups.values()].flatMap((group) => group.map((token, index) => {
          const point = pointFor(token);
          return point ? renderToken(token, point, "5.4%", index, group.length) : null;
        }))}
        <div className="lw7-finish-panel" aria-label="Finished token boxes">
          {COLORS.map((color) => {
            const bay = FINISH_BAYS[color];
            const finished = (finishedByColor.get(color) ?? []).slice(0, 4);
            return (
              <div key={color} className="lw7-finish-bay" style={{ left: `${bay.left}%`, top: `${bay.top}%`, width: `${bay.width}%`, height: `${bay.height}%`, background: `${palette[color]}18`, borderColor: palette[color] }}>
                {finished.map((token, index) => {
                  const slot = FINISH_SLOTS[index] ?? FINISH_SLOTS[0];
                  return <button key={`finished-${keyOf(token)}`} type="button" aria-label={`${color} finished token`} className="lw7-token lw7-finish-token" style={{ left: `${slot[0]}%`, top: `${slot[1]}%`, width: "27%", background: palette[color] }} />;
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
