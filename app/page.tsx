"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

const COLORS = { green: "#16a34a", yellow: "#f4b400", red: "#ef233c", blue: "#2563eb" } as const;
type Color = keyof typeof COLORS;
const ORDER: Color[] = ["green", "yellow", "red", "blue"];

// Perimeter route. Progress 0 is each color's marked first-exit square.
const BOARD_ROUTE: [number, number][] = [
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],
];
// Exact first-exit squares marked on the board.
const START_INDEX: Record<Color, number> = { green: 14, yellow: 27, blue: 40, red: 1 };
const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const COLORED_EXITS: Record<string, Color> = { "6-1": "green", "1-8": "yellow", "8-13": "blue", "13-6": "red" };
const LANES: Record<Color, [number, number][]> = {
  red: [[13,7],[12,7],[11,7],[10,7],[9,7]], green: [[7,1],[7,2],[7,3],[7,4],[7,5]],
  yellow: [[1,7],[2,7],[3,7],[4,7],[5,7]], blue: [[7,9],[7,10],[7,11],[7,12],[7,13]],
};
function routeIndexFor(color: Color, progress: number) { return (START_INDEX[color] + progress) % BOARD_ROUTE.length; }

function Home({ color, className, tokens, onTokenClick }: { color: Color; className: string; tokens: number[]; onTokenClick: (i: number) => void }) {
  return <div className={`home ${className}`} style={{ background: COLORS[color] }}><div className="home-yard">
    {tokens.map((progress, i) => <button key={i} className={`home-slot ${progress >= 0 ? "token-home-active" : ""}`} onClick={() => onTokenClick(i)} aria-label={`${color} token ${i + 1}`}>
      {progress < 0 ? <span className="token token-home" style={{ background: COLORS[color] }} /> : <span className="token token-home token-hidden" />}
    </button>)}
  </div></div>;
}
function Center() { return <div className="center"><div className="center-triangle center-green"/><div className="center-triangle center-yellow"/><div className="center-triangle center-red"/><div className="center-triangle center-blue"/></div>; }

export default function HomePage() {
  const [turn, setTurn] = useState<Color>("green");
  const [dice, setDice] = useState<number | null>(null);
  const [tokens, setTokens] = useState<Record<Color, number[]>>({ green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], red: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] });
  const [message, setMessage] = useState("Test mode: press Force 6, then tap a home token to enter on its colored exit.");

  const routeTokens = useMemo(() => {
    const result: { color: Color; token: number; progress: number; row: number; col: number }[] = [];
    ORDER.forEach(color => tokens[color].forEach((progress, token) => { if (progress >= 0 && progress < BOARD_ROUTE.length) { const [row,col] = BOARD_ROUTE[routeIndexFor(color, progress)]; result.push({color,token,progress,row,col}); } }));
    return result;
  }, [tokens]);

  function roll(value?: number) { const next = value ?? Math.floor(Math.random() * 6) + 1; setDice(next); setMessage(`${turn.toUpperCase()} rolled ${next}. ${next === 6 ? "Choose a home token to enter." : "Choose a token on the board to move."}`); }
  function finishTurn() { if (dice !== 6) setTurn(ORDER[(ORDER.indexOf(turn) + 1) % ORDER.length]); setDice(null); }
  function moveToken(color: Color, tokenIndex: number) {
    if (color !== turn) { setMessage(`It is ${turn.toUpperCase()}'s turn.`); return; }
    const current = tokens[color][tokenIndex];
    if (dice === null) { setMessage("Roll the dice first."); return; }
    if (current < 0) {
      if (dice !== 6) { setMessage("A token needs a 6 to enter."); return; }
      setTokens({ ...tokens, [color]: tokens[color].map((p,i) => i === tokenIndex ? 0 : p) });
      setMessage(`${color.toUpperCase()} token ${tokenIndex + 1} entered on its colored first-exit square.`); finishTurn(); return;
    }
    const nextProgress = current + dice;
    if (nextProgress >= BOARD_ROUTE.length) { setMessage("This minimal engine does not yet implement the final home lane."); return; }
    setTokens({ ...tokens, [color]: tokens[color].map((p,i) => i === tokenIndex ? nextProgress : p) });
    setMessage(`${color.toUpperCase()} token ${tokenIndex + 1} moved ${dice} spaces.`); finishTurn();
  }
  function reset() { setTokens({ green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], red: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] }); setTurn("green"); setDice(null); setMessage("Reset. Green starts."); }

  return <main className="board-page"><section className="game-shell">
    <div className="game-controls"><div><strong>{turn.toUpperCase()}</strong> turn <span className="test-badge">TEST MODE</span></div><div className="dice-value">{dice ?? "—"}</div><button onClick={() => roll()} className="control-button">Roll Dice</button><button onClick={() => roll(6)} className="control-button">Force 6</button><button onClick={reset} className="control-button secondary">Reset</button></div>
    <p className="status">{message}</p>
    <div className="ludo-board" aria-label="Ludo board">
      <div className="grid">{Array.from({ length: 225 }, (_, index) => { const row=Math.floor(index/15),col=index%15,key=`${row}-${col}`; const routeIndex=BOARD_ROUTE.findIndex(([r,c])=>r===row&&c===col); const exitColor=COLORED_EXITS[key]; const laneColor=(Object.keys(LANES) as Color[]).find(color=>LANES[color].some(([r,c])=>r===row&&c===col)); if(routeIndex>=0)return <div key={key} className={`cell path ${safe.has(routeIndex)?"safe":""} ${exitColor?`exit-${exitColor}`:""}`}>{safe.has(routeIndex)&&<span className="safe-star">★</span>}</div>; if(laneColor)return <div key={key} className={`cell home-lane lane-${laneColor}`}/>; return <div key={key} className="cell empty"/>; })}</div>
      {routeTokens.map(t => <button key={`${t.color}-${t.token}`} className="route-token" style={{ "--row":t.row, "--col":t.col, background:COLORS[t.color] } as CSSProperties} onClick={() => moveToken(t.color, t.token)} aria-label={`Move ${t.color} token ${t.token+1}`}/>) }
      <Home color="green" className="home-green" tokens={tokens.green} onTokenClick={i=>moveToken("green",i)}/><Home color="yellow" className="home-yellow" tokens={tokens.yellow} onTokenClick={i=>moveToken("yellow",i)}/><Home color="red" className="home-red" tokens={tokens.red} onTokenClick={i=>moveToken("red",i)}/><Home color="blue" className="home-blue" tokens={tokens.blue} onTokenClick={i=>moveToken("blue",i)}/><Center/>
    </div>
  </section></main>;
}
