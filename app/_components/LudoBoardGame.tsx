"use client";
import React, { useEffect, useRef, useState } from "react";
import BaseBoard, { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId, type DemoToken } from "./LudoBoardFixed";

export type { BoardThemeId, DemoToken };
export { BOARD_NAMES, BOARD_PALETTES };

type Props = {
  theme?: BoardThemeId;
  preview?: boolean;
  className?: string;
  style?: React.CSSProperties;
  demoTokens?: DemoToken[];
  onTokenClick?: (color: DemoToken["color"], id: number) => void;
};

const finishedOrder = ["green", "yellow", "red", "blue"] as const;
const MOVE_STEP_MS = 220;

function tokenKey(token: DemoToken) {
  return `${token.color}:${token.id}`;
}

function tokenState(position: number): DemoToken["state"] {
  if (position === 0) return "yard";
  if (position === 56) return "finished";
  if (position > 51) return "home";
  return "track";
}

export default function LudoBoardGame({ theme = "classic", preview = false, className = "", style, demoTokens = [], onTokenClick }: Props) {
  const [displayTokens, setDisplayTokens] = useState<DemoToken[]>(demoTokens);
  const displayRef = useRef<DemoToken[]>(demoTokens);
  const timersRef = useRef<Record<string, number>>({});
  const mountedRef = useRef(false);

  useEffect(() => {
    displayRef.current = displayTokens;
  }, [displayTokens]);

  useEffect(() => {
    const incoming = new Map(demoTokens.map(token => [tokenKey(token), token]));

    if (!mountedRef.current) {
      mountedRef.current = true;
      displayRef.current = demoTokens;
      setDisplayTokens(demoTokens);
      return;
    }

    // Remove tokens that no longer exist, while preserving the currently
    // animated position of tokens that are still moving.
    const current = new Map(displayRef.current.map(token => [tokenKey(token), token]));
    for (const key of Object.keys(timersRef.current)) {
      if (!incoming.has(key)) {
        window.clearTimeout(timersRef.current[key]);
        delete timersRef.current[key];
      }
    }

    for (const [key, targetToken] of incoming) {
      const currentToken = current.get(key);
      if (!currentToken) {
        current.set(key, targetToken);
        continue;
      }

      const from = Number(currentToken.position);
      const to = Number(targetToken.position);
      if (from === to || timersRef.current[key]) {
        if (from === to) current.set(key, targetToken);
        continue;
      }

      // Walk exactly one board position at a time. This prevents a remote
      // game-state update from teleporting a token from its old square to the
      // final square in one render.
      const direction = to > from ? 1 : -1;
      const advance = () => {
        const live = displayRef.current.find(token => tokenKey(token) === key);
        if (!live) {
          delete timersRef.current[key];
          return;
        }
        const nextPosition = Number(live.position) + direction;
        const reached = direction > 0 ? nextPosition >= to : nextPosition <= to;
        const position = reached ? to : nextPosition;
        const nextState = reached ? targetToken.state : tokenState(position);

        const nextTokens = displayRef.current.map(token =>
          tokenKey(token) === key ? { ...token, position, state: nextState } : token
        );
        displayRef.current = nextTokens;
        setDisplayTokens(nextTokens);

        if (reached) {
          delete timersRef.current[key];
          return;
        }
        timersRef.current[key] = window.setTimeout(advance, MOVE_STEP_MS);
      };

      timersRef.current[key] = window.setTimeout(advance, MOVE_STEP_MS);
    }

    // Reconcile unchanged tokens and add/remove tokens without interrupting
    // active step-by-step animations.
    const reconciled = displayRef.current.filter(token => incoming.has(tokenKey(token)));
    for (const token of incoming.values()) {
      if (!reconciled.some(existing => tokenKey(existing) === tokenKey(token))) {
        reconciled.push(token);
      }
    }
    displayRef.current = reconciled;
    setDisplayTokens(reconciled);
  }, [demoTokens]);

  useEffect(() => () => {
    Object.values(timersRef.current).forEach(timer => window.clearTimeout(timer));
    timersRef.current = {};
  }, []);

  const finished = finishedOrder.flatMap(color =>
    displayTokens
      .filter(t => t.color === color && t.state === "finished")
      .sort((a, b) => a.id - b.id)
      .map(t => ({ ...t, color }))
  );

  const boardTokens = displayTokens.filter(t => t.state !== "finished");

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1", ...style }} className={className}>
      <BaseBoard
        theme={theme}
        preview={preview}
        demoTokens={boardTokens}
        onTokenClick={onTokenClick}
        style={{ width: "100%", height: "100%" }}
      />
      <div
        aria-label={`Finished tokens: ${finished.length}`}
        style={{
          position: "absolute", left: "40%", top: "40%", width: "20%", height: "20%",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(3, 1fr)",
          gap: "1%", padding: "5%", boxSizing: "border-box", placeItems: "center",
          pointerEvents: "none", zIndex: 20, overflow: "hidden",
        }}
      >
        {finished.map(t => (
          <div key={`${t.color}-${t.id}`} style={{
            width: "90%", height: "90%", minWidth: 0, minHeight: 0,
            borderRadius: "50%", background: t.color,
            border: "1px solid rgba(255,255,255,.95)",
            boxShadow: "0 2px 5px rgba(0,0,0,.35)",
          }} />
        ))}
      </div>
    </div>
  );
}
