"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import LudoBoardFixed, { BOARD_NAMES, BOARD_PALETTES, type BoardThemeId, type DemoToken } from "./LudoBoardFixed";
import { getTokenCell as getCanonicalTokenCell } from "../../lib/canonicalLudoBoard";
import { getTokenCell as getRenderTokenCell } from "../../lib/ludoBoardCore";

export type { BoardThemeId, DemoToken };
export { BOARD_NAMES, BOARD_PALETTES };

type Props = { theme?: BoardThemeId; preview?: boolean; className?: string; style?: React.CSSProperties; demoTokens?: DemoToken[]; onTokenClick?: (color: DemoToken["color"], id: number) => void; snapOnUpdate?: boolean; finishSound?: boolean; animateUpdates?: boolean; legalTokenKeys?: string[] };
const COLORS: DemoToken["color"][] = ["red", "yellow", "green", "blue"];
const STATIC_TOKENS: DemoToken[] = COLORS.flatMap(color => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const YARD_CENTERS: Record<DemoToken["color"], Array<[number, number]>> = { green: [[13.61,13.61],[13.61,26.39],[26.39,13.61],[26.39,26.39]], yellow: [[13.61,73.61],[13.61,86.39],[26.39,73.61],[26.39,86.39]], red: [[73.61,13.61],[73.61,26.39],[86.39,13.61],[86.39,26.39]], blue: [[73.61,73.61],[73.61,86.39],[86.39,73.61],[86.39,86.39]] };
const keyOf = (t: DemoToken) => `${t.color}:${t.id}`;
function canonicalCell(t: DemoToken) { if (t.state === "yard" || t.state === "finished") return null; return getCanonicalTokenCell(t.color, Number(t.position)); }

// Multiplayer rules are 1-based on the main track; the shared visual board is 0-based.
// Progress 1 must therefore render at visual track step 0. Home progress 52+ already
// uses the visual board's home-lane coordinates and is passed through unchanged.
function toRenderToken(t: DemoToken): DemoToken {
  if (t.state === "track" && t.position >= 1 && t.position <= 51) return { ...t, position: t.position - 1, state: "track" };
  return t;
}

function cellPosition(t: DemoToken) {
  if (t.state === "yard") { const c = YARD_CENTERS[t.color]?.[t.id] || YARD_CENTERS[t.color]?.[0]; return c ? [c[1], c[0]] : null; }
  if (t.state === "finished") return null;
  if (t.state === "track" && t.position >= 1 && t.position <= 51) { const cell = getRenderTokenCell(t.color, t.position - 1); return cell ? [(cell[1] + .5) * 100 / 15, (cell[0] + .5) * 100 / 15] : null; }
  const cell = canonicalCell(t); return cell ? [(cell[1] + .5) * 100 / 15, (cell[0] + .5) * 100 / 15] : null;
}
function emitAudio(kind: "move" | "capture" | "safe" | "home" | "finish" | "win") { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind })); }

export default function LudoBoardMultiplayer({ theme="classic", preview=false, className="", style, demoTokens=[], onTokenClick, snapOnUpdate=false, finishSound=false, animateUpdates=true, legalTokenKeys=[] }: Props) {
  const tokens = useMemo(() => { const map = new Map(STATIC_TOKENS.map(t => [keyOf(t), t])); for (const t of demoTokens) map.set(keyOf(t), t); return Array.from(map.values()); }, [demoTokens]);
  const [displayTokens, setDisplayTokens] = useState<DemoToken[]>(tokens);
  const displayRef = useRef(tokens);
  const timersRef = useRef<Record<string, number>>({});
  const mountedRef = useRef(false);
  useEffect(() => { displayRef.current = displayTokens; }, [displayTokens]);

  useEffect(() => {
    const incoming = new Map(tokens.map(t => [keyOf(t), t]));
    if (!mountedRef.current) { mountedRef.current = true; displayRef.current = tokens; setDisplayTokens(tokens); return; }
    if (snapOnUpdate || !animateUpdates) { Object.values(timersRef.current).forEach(timer => window.clearTimeout(timer)); timersRef.current = {}; displayRef.current = Array.from(incoming.values()); setDisplayTokens(displayRef.current); return; }
    const current = new Map(displayRef.current.map(t => [keyOf(t), t]));
    for (const [key, target] of incoming) {
      const currentToken = current.get(key); if (!currentToken) { current.set(key, target); continue; }
      const from = Number(currentToken.position), to = Number(target.position);
      if (from === to || timersRef.current[key]) continue;
      if (currentToken.position > 0 && target.state === "yard") { current.set(key, target); displayRef.current = Array.from(current.values()); setDisplayTokens(displayRef.current); emitAudio("capture"); delete timersRef.current[key]; continue; }
      const direction = to > from ? 1 : -1;
      const advance = () => {
        const live = displayRef.current.find(t => keyOf(t) === key); if (!live) { delete timersRef.current[key]; return; }
        const nextPosition = Number(live.position) + direction;
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

  useEffect(() => () => { Object.values(timersRef.current).forEach(timer => window.clearTimeout(timer)); timersRef.current = {}; }, []);
  const renderTokens = useMemo(() => displayTokens.map(toRenderToken), [displayTokens]);
  const startTrackTokens = useMemo(() => displayTokens.filter(t => t.state === "track" && t.position === 1), [displayTokens]);
  const legal = new Set(legalTokenKeys);
  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;

  return <div className="mp-board-wrap" style={{ position:"relative", width:"100%", aspectRatio:"1", ...style }}>
    <LudoBoardFixed theme={theme} preview={preview} className={className} style={{ width:"100%", height:"100%" }} demoTokens={renderTokens.filter(t => !(t.state === "track" && t.position === 0))} onTokenClick={onTokenClick} />
    <div className="mp-overlay" aria-hidden="true">
      {startTrackTokens.map(token => { const pos = cellPosition(token); if (!pos) return null; return <button key={`start-${keyOf(token)}`} type="button" onClick={() => onTokenClick?.(token.color, token.id)} aria-label={`${legal.has(keyOf(token)) ? "Legal move for " : ""}${token.color} token`} style={{ position:"absolute", left:`${pos[0]}%`, top:`${pos[1]}%`, transform:"translate(-50%,-50%)", width:"5.1%", aspectRatio:1, borderRadius:"50%", border:"2px solid #222", background:palette[token.color], zIndex:30, fontWeight:900, padding:0, color:"transparent", fontSize:0, cursor:legal.has(keyOf(token)) ? "pointer" : "default", pointerEvents:legal.has(keyOf(token)) ? "auto" : "none", filter:legal.has(keyOf(token)) ? "brightness(1.08)" : "none", animation:legal.has(keyOf(token)) ? "canonicalTokenBreath 1.45s ease-in-out infinite" : undefined }} />; })}
      {displayTokens.map(token => { if (!legal.has(keyOf(token))) return null; const pos = cellPosition(token); if (!pos) return null; return <span key={`pulse-${keyOf(token)}`} aria-hidden="true" style={{ position:"absolute", left:`${pos[0]}%`, top:`${pos[1]}%`, width:token.state === "yard" ? "10%" : "7.4%", aspectRatio:"1", transform:"translate(-50%,-50%)", borderRadius:"50%", background:"transparent", border:`3px solid ${palette[token.color]}`, boxShadow:`0 0 0 2px rgba(255,255,255,.9),0 0 16px ${palette[token.color]}`, animation:"mpLegalBreath 1.15s ease-in-out infinite", pointerEvents:"none", zIndex:31 }} />; })}
    </div>
    <style jsx global>{`@keyframes mpLegalBreath{0%,100%{opacity:.35;transform:translate(-50%,-50%) scale(.9)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}}.mp-board-wrap{position:relative}.mp-overlay{position:absolute;left:-6px;top:-6px;width:calc(100% + 12px);height:calc(100% + 12px);pointer-events:none;z-index:40}.mp-overlay button{font-size:0!important;color:transparent!important;text-indent:-9999px!important;pointer-events:none}.mp-overlay button[style*="pointer-events: auto"]{pointer-events:auto!important}`}</style>
  </div>;
}
