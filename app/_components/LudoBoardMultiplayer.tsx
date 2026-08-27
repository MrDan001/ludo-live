"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import LudoBoard, { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId, type DemoToken } from "./LudoBoard";
import { getTokenCell as getCanonicalTokenCell } from "../../lib/canonicalLudoBoard";
import { getTokenCell as getRenderTokenCell } from "../../lib/ludoBoardCore";

export type { BoardThemeId, DemoToken };
export { BOARD_NAMES, BOARD_PALETTES };

type Props = {
  theme?: BoardThemeId; preview?: boolean; className?: string; style?: React.CSSProperties;
  demoTokens?: DemoToken[]; onTokenClick?: (color: DemoToken["color"], id: number) => void;
  snapOnUpdate?: boolean; finishSound?: boolean; animateUpdates?: boolean; legalTokenKeys?: string[];
};

const COLORS: DemoToken["color"][] = ["red", "yellow", "green", "blue"];
const STATIC_TOKENS: DemoToken[] = COLORS.flatMap(color => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));

// Centers of the actual four token slots used by LudoBoard's 6x6 home grid.
// Kept in the same 15x15 board coordinate system as the rendered board.
const YARD_CENTERS: Record<DemoToken["color"], Array<[number, number]>> = {
  green: [[13.5, 13.5], [13.5, 26.5], [26.5, 13.5], [26.5, 26.5]],
  yellow: [[13.5, 73.5], [13.5, 86.5], [26.5, 73.5], [26.5, 86.5]],
  red: [[73.5, 13.5], [73.5, 26.5], [86.5, 13.5], [86.5, 26.5]],
  blue: [[73.5, 73.5], [73.5, 86.5], [86.5, 73.5], [86.5, 86.5]],
};

const keyOf = (t: DemoToken) => `${t.color}:${t.id}`;
function canonicalCell(t: DemoToken) { if (t.state === "yard" || t.state === "finished") return null; return getCanonicalTokenCell(t.color, Number(t.position)); }
function toRenderToken(t: DemoToken): DemoToken {
  if (t.state === "track" && t.position >= 1 && t.position <= 51) return { ...t, position: t.position - 1, state: "track" };
  return t;
}
function cellPosition(t: DemoToken): [string, string] | null {
  if (t.state === "yard") { const c = YARD_CENTERS[t.color]?.[t.id] || YARD_CENTERS[t.color]?.[0]; return c ? [`${c[1]}%`, `${c[0]}%`] : null; }
  if (t.state === "finished") return null;
  if (t.state === "track" && t.position >= 1 && t.position <= 51) {
    const cell = getRenderTokenCell(t.color, t.position - 1);
    return cell ? [`${(cell[1] + .5) * 100 / 15}%`, `${(cell[0] + .5) * 100 / 15}%`] : null;
  }
  const cell = canonicalCell(t);
  return cell ? [`${(cell[1] + .5) * 100 / 15}%`, `${(cell[0] + .5) * 100 / 15}%`] : null;
}
function emitAudio(kind: "move" | "capture" | "safe" | "home" | "finish" | "win") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind }));
}

export default function LudoBoardMultiplayer({ theme="classic", preview=false, className="", style, demoTokens=[], onTokenClick, snapOnUpdate=false, finishSound=false, animateUpdates=true, legalTokenKeys=[] }: Props) {
  const tokens = useMemo(() => { const map = new Map(STATIC_TOKENS.map(t => [keyOf(t), t])); for (const t of demoTokens) map.set(keyOf(t), t); return Array.from(map.values()); }, [demoTokens]);
  const [displayTokens, setDisplayTokens] = useState<DemoToken[]>(tokens);
  const displayRef = useRef(tokens);
  const timersRef = useRef<Record<string, number>>({});
  const launchTimersRef = useRef<Record<string, number>>({});
  const [launchingKeys, setLaunchingKeys] = useState<Set<string>>(new Set());
  const mountedRef = useRef(false);

  useEffect(() => { displayRef.current = displayTokens; }, [displayTokens]);

  useEffect(() => {
    const incoming = new Map(tokens.map(t => [keyOf(t), t]));
    if (!mountedRef.current) { mountedRef.current = true; displayRef.current = tokens; setDisplayTokens(tokens); return; }
    if (snapOnUpdate || !animateUpdates) {
      Object.values(timersRef.current).forEach(timer => window.clearTimeout(timer));
      Object.values(launchTimersRef.current).forEach(timer => window.clearTimeout(timer));
      timersRef.current = {}; launchTimersRef.current = {}; setLaunchingKeys(new Set());
      displayRef.current = Array.from(incoming.values()); setDisplayTokens(displayRef.current); return;
    }
    const current = new Map(displayRef.current.map(t => [keyOf(t), t]));
    for (const [key, target] of incoming) {
      const currentToken = current.get(key);
      if (!currentToken) { current.set(key, target); continue; }
      const from = Number(currentToken.position), to = Number(target.position);
      if (from === to || timersRef.current[key]) continue;
      if (currentToken.position > 0 && target.state === "yard") {
        current.set(key, target); displayRef.current = Array.from(current.values()); setDisplayTokens(displayRef.current); emitAudio("capture"); delete timersRef.current[key]; continue;
      }

      // IMPORTANT: a yard token entering play is a special transition.
      // Put its logical state at position 1 immediately, then animate only the
      // visual token from the yard slot to the first track cell. This prevents
      // React from rendering it back in the yard while the pulse waits outside.
      if (from === 0 && to === 1 && target.state === "track") {
        const launched = displayRef.current.map(t => keyOf(t) === key ? { ...target, position: 1, state: "track" as const } : t);
        displayRef.current = launched;
        setDisplayTokens(launched);
        setLaunchingKeys(prev => new Set(prev).add(key));
        if (launchTimersRef.current[key]) window.clearTimeout(launchTimersRef.current[key]);
        launchTimersRef.current[key] = window.setTimeout(() => {
          setLaunchingKeys(prev => { const next = new Set(prev); next.delete(key); return next; });
          delete launchTimersRef.current[key];
        }, 220);
        emitAudio("move");
        delete timersRef.current[key];
        continue;
      }

      const direction = to > from ? 1 : -1;
      const advance = () => {
        const live = displayRef.current.find(t => keyOf(t) === key);
        if (!live) { delete timersRef.current[key]; return; }
        const previousPosition = Number(live.position), nextPosition = previousPosition + direction;
        const reached = direction > 0 ? nextPosition >= to : nextPosition <= to;
        const position = reached ? to : nextPosition;
        const nextState: DemoToken["state"] = position <= 0 ? "yard" : position >= 57 ? "finished" : position >= 52 ? "home" : "track";
        const nextTokens = displayRef.current.map(t => keyOf(t) === key ? { ...t, position, state: nextState } : t);
        displayRef.current = nextTokens; setDisplayTokens(nextTokens);
        if (position >= 57) emitAudio("finish"); else if (nextState === "home") emitAudio("home"); else emitAudio("move");
        if (reached) { delete timersRef.current[key]; return; }
        timersRef.current[key] = window.setTimeout(advance, 220);
      };
      timersRef.current[key] = window.setTimeout(advance, 220);
    }
    const reconciled = displayRef.current.filter(t => incoming.has(keyOf(t)));
    for (const token of incoming.values()) if (!reconciled.some(t => keyOf(t) === keyOf(token))) reconciled.push(token);
    displayRef.current = reconciled; setDisplayTokens(reconciled);
  }, [tokens, snapOnUpdate, animateUpdates]);

  useEffect(() => () => {
    Object.values(timersRef.current).forEach(timer => window.clearTimeout(timer));
    Object.values(launchTimersRef.current).forEach(timer => window.clearTimeout(timer));
  }, []);

  const renderTokens = useMemo(() => displayTokens.map(toRenderToken), [displayTokens]);
  const legal = new Set(legalTokenKeys);
  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const boardTokens = useMemo(() => renderTokens.filter(t => !launchingKeys.has(keyOf(t))), [renderTokens, launchingKeys]);
  const launchTokens = useMemo(() => displayTokens.filter(t => launchingKeys.has(keyOf(t))), [displayTokens, launchingKeys]);

  return (
    <div className="mp-board-wrap" style={{ position:"relative", width:"100%", aspectRatio:"1", ...style }}>
      <LudoBoard theme={theme} preview={preview} className={className} style={{ width:"100%", height:"100%" }} demoTokens={boardTokens} onTokenClick={onTokenClick} />
      <div className="mp-overlay" aria-hidden="true">
        {launchTokens.map(token => {
          const yard = YARD_CENTERS[token.color]?.[token.id];
          const start = cellPosition({ ...token, state:"track", position:1 });
          if (!yard || !start) return null;
          const yardX = yard[1], yardY = yard[0], startX = Number.parseFloat(start[0]), startY = Number.parseFloat(start[1]);
          return <span key={`launch-${keyOf(token)}`} style={{ position:"absolute", left:`${yardX}%`, top:`${yardY}%`, width:"5.1%", aspectRatio:1, borderRadius:"50%", border:"2px solid #222", background:palette[token.color], transform:"translate(-50%,-50%)", zIndex:30, pointerEvents:"none", animation:"mpLaunch 220ms cubic-bezier(.22,.8,.32,1) forwards", ["--launch-dx" as string]:`calc(${startX}% - ${yardX}%)`, ["--launch-dy" as string]:`calc(${startY}% - ${yardY}%)` } as React.CSSProperties}/>;
        })}
        {displayTokens.map(token => {
          if (!legal.has(keyOf(token)) || launchingKeys.has(keyOf(token))) return null;
          const pos = cellPosition(token); if (!pos) return null;
          const yard = token.state === "yard";
          return <span key={`pulse-${keyOf(token)}`} aria-hidden="true" style={{ position:"absolute", left:pos[0], top:pos[1], width:yard?"6.6%":"5.9%", aspectRatio:1, transform:"translate(-50%,-50%)", borderRadius:"50%", border:`1.5px solid ${palette[token.color]}`, background:"transparent", boxShadow:`0 0 0 1px rgba(255,255,255,.75), 0 0 7px ${palette[token.color]}`, animation:"mpLegalBreath 1.25s ease-in-out infinite", pointerEvents:"none", zIndex:31 }}/>;
        })}
      </div>
      <style jsx global>{`
        @keyframes mpLegalBreath { 0%,100% { opacity:.35; transform:translate(-50%,-50%) scale(.96); } 50% { opacity:1; transform:translate(-50%,-50%) scale(1.035); } }
        @keyframes mpLaunch { 0% { transform:translate(-50%,-50%); } 100% { transform:translate(-50%,-50%) translate(var(--launch-dx),var(--launch-dy)); } }
        .mp-board-wrap { position:relative; }
        .mp-overlay { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:40; }
      `}</style>
    </div>
  );
}
