"use client";
import React, { useEffect, useRef, useState } from "react";
import BaseBoard, { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId, type DemoToken } from "./LudoBoardFixed";
import { FINISH_PROGRESS, getTokenCell, tokenState as canonicalTokenState } from "../../lib/canonicalLudoBoard";

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
};

const finishedOrder = ["green", "yellow", "red", "blue"] as const;
const MOVE_STEP_MS = 220;
const AUDIO_AFTER_RENDER_MS = 55;

function tokenKey(token: DemoToken) { return `${token.color}:${token.id}`; }
function tokenState(position: number): DemoToken["state"] { return canonicalTokenState(position); }
function emitAudio(kind: "move" | "capture" | "finish") {
  if (typeof window !== "undefined") window.setTimeout(() => window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind })), AUDIO_AFTER_RENDER_MS);
}

export default function LudoBoardMultiplayer({
  theme = "classic", preview = false, className = "", style, demoTokens = [], onTokenClick,
  snapOnUpdate = false, finishSound = false, animateUpdates = true,
}: Props) {
  const [displayTokens, setDisplayTokens] = useState<DemoToken[]>(demoTokens);
  const displayRef = useRef<DemoToken[]>(demoTokens);
  const timersRef = useRef<Record<string, number>>({});
  const captureTimersRef = useRef<Record<string, number>>({});
  const mountedRef = useRef(false);

  useEffect(() => { displayRef.current = displayTokens; }, [displayTokens]);

  useEffect(() => {
    const incoming = new Map(demoTokens.map(token => [tokenKey(token), token]));
    if (!mountedRef.current) {
      mountedRef.current = true; displayRef.current = demoTokens; setDisplayTokens(demoTokens); return;
    }
    if (snapOnUpdate || !animateUpdates) {
      Object.values(timersRef.current).forEach(timer => window.clearTimeout(timer));
      Object.values(captureTimersRef.current).forEach(timer => window.clearTimeout(timer));
      timersRef.current = {}; captureTimersRef.current = {};
      const snapped = Array.from(incoming.values()); displayRef.current = snapped; setDisplayTokens(snapped); return;
    }

    const current = new Map(displayRef.current.map(token => [tokenKey(token), token]));
    const captureKeys = new Set<string>();
    for (const [key, targetToken] of incoming) {
      const currentToken = current.get(key);
      if (currentToken && currentToken.state !== "yard" && targetToken.state === "yard" && currentToken.position > 0) captureKeys.add(key);
    }

    for (const key of Object.keys(timersRef.current)) {
      if (!incoming.has(key)) { window.clearTimeout(timersRef.current[key]); delete timersRef.current[key]; }
    }
    for (const key of Object.keys(captureTimersRef.current)) {
      if (!incoming.has(key)) { window.clearTimeout(captureTimersRef.current[key]); delete captureTimersRef.current[key]; }
    }

    // Keep a captured token visible while the attacking token walks to its square.
    // The authoritative server state may already say yard=0; this is presentation only.
    if (captureKeys.size) {
      for (const captureKey of captureKeys) {
        const captured = current.get(captureKey);
        if (!captured || captureTimersRef.current[captureKey]) continue;
        const destination = Number(captured.position);
        const mover = Array.from(incoming.entries()).find(([key, t]) => {
          if (key === captureKey) return false;
          const before = current.get(key);
          return !!before && Number(t.position) === destination && Number(before.position) !== destination && t.state !== "yard";
        });
        const from = mover ? Number(current.get(mover[0])?.position || destination) : destination;
        const steps = Math.max(1, Math.abs(destination - from));
        captureTimersRef.current[captureKey] = window.setTimeout(() => {
          const nextTokens = displayRef.current.map(token => tokenKey(token) === captureKey ? { ...token, position: 0, state: "yard" as const } : token);
          displayRef.current = nextTokens; setDisplayTokens(nextTokens); emitAudio("capture"); delete captureTimersRef.current[captureKey];
        }, steps * MOVE_STEP_MS + 80);
      }
    }

    for (const [key, targetToken] of incoming) {
      const currentToken = current.get(key);
      if (!currentToken) { current.set(key, targetToken); continue; }
      const from = Number(currentToken.position), to = Number(targetToken.position);
      if (from === to || timersRef.current[key]) { if (from === to) current.set(key, targetToken); continue; }

      // A captured token stays in place until the attacker visually reaches it.
      if (captureKeys.has(key)) continue;

      const direction = to > from ? 1 : -1;
      const advance = () => {
        const live = displayRef.current.find(token => tokenKey(token) === key);
        if (!live) { delete timersRef.current[key]; return; }
        const nextPosition = Number(live.position) + direction;
        const reached = direction > 0 ? nextPosition >= to : nextPosition <= to;
        const position = reached ? to : nextPosition;
        const nextState = reached ? targetToken.state : tokenState(position);
        const nextTokens = displayRef.current.map(token => tokenKey(token) === key ? { ...token, position, state: nextState } : token);
        displayRef.current = nextTokens; setDisplayTokens(nextTokens);
        if (reached) {
          if (to === FINISH_PROGRESS || targetToken.state === "finished") emitAudio(finishSound ? "finish" : "move");
          else emitAudio("move");
          delete timersRef.current[key]; return;
        }
        emitAudio("move"); timersRef.current[key] = window.setTimeout(advance, MOVE_STEP_MS);
      };
      timersRef.current[key] = window.setTimeout(advance, MOVE_STEP_MS);
    }

    const reconciled = displayRef.current.filter(token => incoming.has(tokenKey(token)));
    for (const token of incoming.values()) {
      const key = tokenKey(token);
      if (captureKeys.has(key)) continue;
      if (!reconciled.some(existing => tokenKey(existing) === key)) reconciled.push(token);
    }
    displayRef.current = reconciled; setDisplayTokens(reconciled);
  }, [demoTokens, snapOnUpdate, finishSound, animateUpdates]);

  useEffect(() => () => {
    Object.values(timersRef.current).forEach(timer => window.clearTimeout(timer));
    Object.values(captureTimersRef.current).forEach(timer => window.clearTimeout(timer));
    timersRef.current = {}; captureTimersRef.current = {};
  }, []);

  const finished = finishedOrder.flatMap(color => displayTokens
    .filter(t => t.color === color && (t.state === "finished" || Number(t.position) >= FINISH_PROGRESS))
    .sort((a, b) => a.id - b.id)
    .map(t => ({ ...t, color, position: FINISH_PROGRESS, state: "finished" as const })));
  const moving = displayTokens.filter(t => t.state !== "yard" && t.state !== "finished" && Number(t.position) > 0 && Number(t.position) < FINISH_PROGRESS);
  const yard = displayTokens.filter(t => t.state === "yard" || Number(t.position) === 0);

  return <div style={{ position: "relative", width: "100%", aspectRatio: "1", ...style }} className={className}>
    <BaseBoard theme={theme} preview={preview} demoTokens={yard} onTokenClick={onTokenClick} style={{ width: "100%", height: "100%" }} />
    {moving.map(t => {
      const cell = getTokenCell(t.color, Number(t.position)); if (!cell) return null;
      const [row, col] = cell;
      return <button key={tokenKey(t)} type="button" onClick={() => onTokenClick?.(t.color, t.id)} aria-label={`${t.color} token ${t.id + 1}`} style={{ position: "absolute", left: `${((col + 0.5) * 100) / 15}%`, top: `${((row + 0.5) * 100) / 15}%`, transform: "translate(-50%,-50%)", width: "5.1%", aspectRatio: 1, borderRadius: "50%", border: "2px solid #222", background: BOARD_PALETTES[theme][t.color], boxShadow: "0 2px 5px rgba(0,0,0,.35)", zIndex: 30, padding: 0, color: "transparent", fontSize: 0, cursor: onTokenClick ? "pointer" : "default" }} />;
    })}
    <div aria-label={`Finished tokens: ${finished.length}`} style={{ position: "absolute", left: "40%", top: "40%", width: "20%", height: "20%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(4, 1fr)", gap: "2%", padding: "4%", boxSizing: "border-box", placeItems: "center", pointerEvents: "none", zIndex: 100, overflow: "visible" }}>
      {finished.map(t => <div key={tokenKey(t)} style={{ width: "92%", height: "92%", minWidth: 0, minHeight: 0, borderRadius: "50%", background: BOARD_PALETTES[theme][t.color], border: "1px solid rgba(255,255,255,.95)", boxShadow: "0 2px 5px rgba(0,0,0,.35)" }} />)}
    </div>
  </div>;
}
