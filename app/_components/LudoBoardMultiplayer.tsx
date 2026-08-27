"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import LudoBoard, { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId, type DemoToken } from "./LudoBoard";
import { getTokenCell as getCanonicalTokenCell } from "../../lib/canonicalLudoBoard";
import { getTokenCell as getRenderTokenCell } from "../../lib/ludoBoardCore";

export type { BoardThemeId, DemoToken };
export { BOARD_NAMES, BOARD_PALETTES };

type Props = {
  theme?: BoardThemeId;
  preview?: boolean;
  className?: string;
  style?: React.CSSProperties;
  demoTokens?: DemoToken[];
  onTokenClick?: (color: DemoToken["color"], id: number) => void;
  snapOnUpdate?: boolean;
  finishSound?: boolean;
  animateUpdates?: boolean;
  legalTokenKeys?: string[];
};

const COLORS: DemoToken["color"][] = ["red", "yellow", "green", "blue"];
const STATIC_TOKENS: DemoToken[] = COLORS.flatMap(color =>
  Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const }))
);

// Same 15x15 coordinate space as LudoBoard's yard geometry.
const YARD_CENTERS: Record<DemoToken["color"], Array<[number, number]>> = {
  green: [[13.61, 13.61], [13.61, 26.39], [26.39, 13.61], [26.39, 26.39]],
  yellow: [[13.61, 73.61], [13.61, 86.39], [26.39, 73.61], [26.39, 86.39]],
  red: [[73.61, 13.61], [73.61, 26.39], [86.39, 13.61], [86.39, 26.39]],
  blue: [[73.61, 73.61], [73.61, 86.39], [86.39, 73.61], [86.39, 86.39]],
};

const keyOf = (t: DemoToken) => `${t.color}:${t.id}`;

function canonicalCell(t: DemoToken) {
  if (t.state === "yard" || t.state === "finished") return null;
  return getCanonicalTokenCell(t.color, Number(t.position));
}

// The multiplayer server uses progress 1..51 for the shared track, while
// LudoBoard renders the same physical cells as 0..50.
function toRenderToken(t: DemoToken): DemoToken {
  if (t.state === "track" && t.position >= 1 && t.position <= 51) {
    return { ...t, position: t.position - 1, state: "track" };
  }
  return t;
}

type OverlayPosition = [string, string];

function cellPosition(t: DemoToken): OverlayPosition | null {
  if (t.state === "yard") {
    const c = YARD_CENTERS[t.color]?.[t.id] || YARD_CENTERS[t.color]?.[0];
    return c ? [`${c[1]}%`, `${c[0]}%`] : null;
  }
  if (t.state === "finished") return null;

  if (t.state === "track" && t.position >= 1 && t.position <= 51) {
    const cell = getRenderTokenCell(t.color, t.position - 1);
    return cell
      ? [`${(cell[1] + 0.5) * 100 / 15}%`, `${(cell[0] + 0.5) * 100 / 15}%`]
      : null;
  }

  const cell = canonicalCell(t);
  return cell
    ? [`${(cell[1] + 0.5) * 100 / 15}%`, `${(cell[0] + 0.5) * 100 / 15}%`]
    : null;
}

function emitAudio(kind: "move" | "capture" | "safe" | "home" | "finish" | "win") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind }));
  }
}

export default function LudoBoardMultiplayer({
  theme = "classic",
  preview = false,
  className = "",
  style,
  demoTokens = [],
  onTokenClick,
  snapOnUpdate = false,
  finishSound = false,
  animateUpdates = true,
  legalTokenKeys = [],
}: Props) {
  const tokens = useMemo(() => {
    const map = new Map(STATIC_TOKENS.map(t => [keyOf(t), t]));
    for (const t of demoTokens) map.set(keyOf(t), t);
    return Array.from(map.values());
  }, [demoTokens]);

  const [displayTokens, setDisplayTokens] = useState<DemoToken[]>(tokens);
  const displayRef = useRef(tokens);
  const timersRef = useRef<Record<string, number>>({});
  const launchTimersRef = useRef<Record<string, number>>({});
  const [launchingKeys, setLaunchingKeys] = useState<Set<string>>(new Set());
  const mountedRef = useRef(false);

  useEffect(() => {
    displayRef.current = displayTokens;
  }, [displayTokens]);

  useEffect(() => {
    const incoming = new Map(tokens.map(t => [keyOf(t), t]));

    if (!mountedRef.current) {
      mountedRef.current = true;
      displayRef.current = tokens;
      setDisplayTokens(tokens);
      return;
    }

    if (snapOnUpdate || !animateUpdates) {
      Object.values(timersRef.current).forEach(timer => window.clearTimeout(timer));
      Object.values(launchTimersRef.current).forEach(timer => window.clearTimeout(timer));
      timersRef.current = {};
      launchTimersRef.current = {};
      setLaunchingKeys(new Set());
      displayRef.current = Array.from(incoming.values());
      setDisplayTokens(displayRef.current);
      return;
    }

    const current = new Map(displayRef.current.map(t => [keyOf(t), t]));

    for (const [key, target] of incoming) {
      const currentToken = current.get(key);
      if (!currentToken) {
        current.set(key, target);
        continue;
      }

      const from = Number(currentToken.position);
      const to = Number(target.position);
      if (from === to || timersRef.current[key]) continue;

      if (currentToken.position > 0 && target.state === "yard") {
        current.set(key, target);
        displayRef.current = Array.from(current.values());
        setDisplayTokens(displayRef.current);
        emitAudio("capture");
        delete timersRef.current[key];
        continue;
      }

      const direction = to > from ? 1 : -1;

      const advance = () => {
        const live = displayRef.current.find(t => keyOf(t) === key);
        if (!live) {
          delete timersRef.current[key];
          return;
        }

        const previousPosition = Number(live.position);
        const nextPosition = previousPosition + direction;
        const reached = direction > 0 ? nextPosition >= to : nextPosition <= to;
        const position = reached ? to : nextPosition;
        const nextState: DemoToken["state"] =
          position <= 0 ? "yard" : position >= 57 ? "finished" : position >= 52 ? "home" : "track";

        const nextTokens = displayRef.current.map(t =>
          keyOf(t) === key ? { ...t, position, state: nextState } : t
        );

        displayRef.current = nextTokens;
        setDisplayTokens(nextTokens);

        if (previousPosition === 0 && position === 1 && nextState === "track") {
          setLaunchingKeys(prev => new Set(prev).add(key));
          launchTimersRef.current[key] = window.setTimeout(() => {
            setLaunchingKeys(prev => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
            delete launchTimersRef.current[key];
          }, 220);
        }

        if (position >= 57) emitAudio("finish");
        else if (nextState === "home") emitAudio("home");
        else emitAudio("move");

        if (reached) {
          delete timersRef.current[key];
          return;
        }

        timersRef.current[key] = window.setTimeout(advance, 220);
      };

      timersRef.current[key] = window.setTimeout(advance, 220);
    }

    const reconciled = displayRef.current.filter(t => incoming.has(keyOf(t)));
    for (const token of incoming.values()) {
      if (!reconciled.some(t => keyOf(t) === keyOf(token))) reconciled.push(token);
    }
    displayRef.current = reconciled;
    setDisplayTokens(reconciled);
  }, [tokens, snapOnUpdate, animateUpdates]);

  useEffect(() => () => {
    Object.values(timersRef.current).forEach(timer => window.clearTimeout(timer));
    Object.values(launchTimersRef.current).forEach(timer => window.clearTimeout(timer));
    timersRef.current = {};
    launchTimersRef.current = {};
  }, []);

  const renderTokens = useMemo(() => displayTokens.map(toRenderToken), [displayTokens]);
  const legal = new Set(legalTokenKeys);
  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;

  // Use the real shared LudoBoard directly. LudoBoard owns the yard/grid
  // geometry and the track token size; the multiplayer layer only supplies
  // synchronized state and the legal-move pulse.
  const boardTokens = useMemo(
    () => renderTokens.filter(t => !launchingKeys.has(keyOf(t))),
    [renderTokens, launchingKeys]
  );

  const launchTokens = useMemo(
    () => displayTokens.filter(t => launchingKeys.has(keyOf(t))),
    [displayTokens, launchingKeys]
  );

  return (
    <div
      className="mp-board-wrap"
      style={{ position: "relative", width: "100%", aspectRatio: "1", ...style }}
    >
      <LudoBoard
        theme={theme}
        preview={preview}
        className={className}
        style={{ width: "100%", height: "100%" }}
        demoTokens={boardTokens}
        onTokenClick={onTokenClick}
      />

      <div className="mp-overlay" aria-hidden="true">
        {launchTokens.map(token => {
          const yard = YARD_CENTERS[token.color]?.[token.id];
          const start = cellPosition({ ...token, state: "track", position: 1 });
          if (!yard || !start) return null;

          const yardX = yard[1];
          const yardY = yard[0];
          const startX = Number.parseFloat(start[0]);
          const startY = Number.parseFloat(start[1]);

          return (
            <button
              key={`launch-${keyOf(token)}`}
              type="button"
              onClick={() => onTokenClick?.(token.color, token.id)}
              style={{
                position: "absolute",
                left: `${yardX}%`,
                top: `${yardY}%`,
                width: "5.1%",
                aspectRatio: 1,
                borderRadius: "50%",
                border: "2px solid #222",
                background: palette[token.color],
                transform: "translate(-50%, -50%)",
                zIndex: 30,
                padding: 0,
                color: "transparent",
                fontSize: 0,
                pointerEvents: "none",
                animation: "mpLaunch 220ms cubic-bezier(.22,.8,.32,1) forwards",
                ["--launch-dx" as string]: `calc(${startX}% - ${yardX}%)`,
                ["--launch-dy" as string]: `calc(${startY}% - ${yardY}%)`,
              } as React.CSSProperties}
            />
          );
        })}

        {displayTokens.map(token => {
          if (!legal.has(keyOf(token)) || launchingKeys.has(keyOf(token))) return null;
          const pos = cellPosition(token);
          if (!pos) return null;
          const yard = token.state === "yard";

          return (
            <span
              key={`pulse-${keyOf(token)}`}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: pos[0],
                top: pos[1],
                width: yard ? "9.4%" : "6.1%",
                aspectRatio: 1,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                border: `1.5px solid ${palette[token.color]}`,
                background: "transparent",
                boxShadow: `0 0 0 1px rgba(255,255,255,.85), 0 0 9px ${palette[token.color]}`,
                animation: "mpLegalBreath 1.25s ease-in-out infinite",
                pointerEvents: "none",
                zIndex: 31,
              }}
            />
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes mpLegalBreath {
          0%,100% { opacity:.35; transform:translate(-50%,-50%) scale(.94); }
          50% { opacity:1; transform:translate(-50%,-50%) scale(1.04); }
        }
        @keyframes mpLaunch {
          0% { transform:translate(-50%,-50%); }
          100% { transform:translate(-50%,-50%) translate(var(--launch-dx),var(--launch-dy)); }
        }
        .mp-board-wrap { position:relative; }
        .mp-overlay { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:40; }
        .mp-overlay button { font-size:0!important; color:transparent!important; text-indent:-9999px!important; pointer-events:none; }
      `}</style>
    </div>
  );
}
