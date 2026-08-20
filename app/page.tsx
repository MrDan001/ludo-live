"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createGame, FINISH_PROGRESS, isMovable, killOneOpponent, chooseBotToken, applyMove, PlayerColor, PlayerState } from "../lib/ludo";

const COLORS = { green: "#08a63b", yellow: "#ffad08", red: "#f21b2d", blue: "#1769e8" } as const;
type Choice = "blue" | "green" | "red" | null;
type Dice = [number | null, number | null];

// 48 visible shared-track squares. Each player's entry is aligned with the
// correct home lane so the token makes the intended L/J-shaped turn into it.
const BOARD_ROUTE: [number, number][] = [
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[7,1],[6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],
  [7,13],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6]
];
const TRACK_LENGTH = BOARD_ROUTE.length;

// Entry points remain tied to the existing shared route. The coloured lanes
// below now sit on the home-facing edge of each quadrant, producing the
// L/J-shaped turn seen in the reference board.
const START_INDEX: Record<PlayerColor, number> = { red: 0, green: 16, yellow: 33, blue: 40 };

// Five inner home-lane squares. The sixth coloured square is the visible
// exit/start square rendered by TrackCell, so the lane visually forms the
// requested L/J turn without changing the existing progress rules.
const HOME_LANES: Record<PlayerColor, [number, number][]> = {
  red: [[12,6],[11,6],[10,6],[9,6],[8,6]],
  green: [[5,6],[4,6],[3,6],[2,6],[1,6]],
  yellow: [[6,9],[6,10],[6,11],[6,12],[6,13]],
  blue: [[8,9],[8,10],[8,11],[8,12],[8,13]],
};
const NEXT: Record<PlayerColor, PlayerColor> = { red: "green", green: "yellow", yellow: "blue", blue: "red" };

function pos(row: number, col: number) {
  return { left: `${((col + 0.5) / 15) * 100}%`, top: `${((row + 0.5) / 15) * 100}%` };
}
function tokenPos(color: PlayerColor, progress: number) {
  if (progress < 0 || progress > FINISH_PROGRESS) return null;
  if (progress < TRACK_LENGTH) {
    const [r, c] = BOARD_ROUTE[(START_INDEX[color] + progress) % TRACK_LENGTH];
    return pos(r, c);
  }
  return HOME_LANES[color][progress - TRACK_LENGTH] ? pos(...HOME_LANES[color][progress - TRACK_LENGTH]) : null;
}
function Token({ color }: { color: PlayerColor }) {
  return <div className="token-slot"><div className="token" style={{ background: COLORS[color] }} /></div>;
}
function Home({ color, name, tokens, children }: { color: PlayerColor; name: string; tokens: PlayerState["tokens"]; children?: ReactNode }) {
  return <section className={`home home-${color}`} style={{ background: COLORS[color] }}><h2>{name}</h2>{children ?? <div className="tokens">{tokens.filter(t => t.status === "home").map(t => <Token key={t.id} color={color} />)}</div>}</section>;
}
function Die({ value, onClick, disabled }: { value: number | null; onClick: () => void; disabled: boolean }) {
  return <button className="die" onClick={onClick} disabled={disabled}>{value === null ? "?" : <span className={`pip-grid pips-${value}`}>{Array.from({ length: value }, (_, i) => <i key={i} />)}</span>}</button>;
}

export default function HomePage() {
  const [players, setPlayers] = useState<PlayerState[]>(() => createGame());
  const [turn, setTurn] = useState<PlayerColor>("red");
  const [dice, setDice] = useState<Dice>([null, null]);
  const [used, setUsed] = useState<[boolean, boolean]>([false, false]);
  const [choice, setChoice] = useState<Choice>(null);
  const [moving, setMoving] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [doubleSixes, setDoubleSixes] = useState(0);
  const [started, setStarted] = useState(false);
  const [botBusy, setBotBusy] = useState(false);
  const playersRef = useRef(players);
  playersRef.current = players;

  const me = players.find(p => p.color === "red")!;
  const available = useMemo(() => dice.map((v, i) => v !== null && !used[i]), [dice, used]);
  const total = dice[0] !== null && dice[1] !== null ? dice[0] + dice[1] : null;
  const forfeited = doubleSixes >= 3;

  function clearDice() { setDice([null, null]); setUsed([false, false]); setChoice(null); }
  function nextTurn() { clearDice(); setDoubleSixes(0); setTurn(NEXT[turn]); }
  function legal(token: PlayerState["tokens"][number], roll: number, merged: boolean) {
    return !(merged && token.status === "home") && isMovable(token, roll);
  }

  function roll() {
    if (turn !== "red" || rolling || moving || botBusy || forfeited || !(dice[0] === null || (used[0] && used[1]))) return;
    setRolling(true);
    setChoice(null);
    window.setTimeout(() => {
      const a = !started ? 6 : Math.floor(Math.random() * 6) + 1;
      const b = Math.floor(Math.random() * 6) + 1;
      setStarted(true); setDice([a, b]); setUsed([false, false]); setDoubleSixes(a === 6 && b === 6 ? doubleSixes + 1 : 0); setRolling(false);
    }, 350);
  }

  function selectChoice(c: Choice) {
    if (turn !== "red" || moving || forfeited || c === null) return;
    if (c === "blue" && !available[0]) return;
    if (c === "green" && !available[1]) return;
    if (c === "red" && !(available[0] && available[1])) return;
    const value = c === "blue" ? dice[0] : c === "green" ? dice[1] : total;
    if (value === null || !me.tokens.some(t => legal(t, value, c === "red"))) return;
    setChoice(c);
  }

  async function moveHuman(id: number) {
    if (!choice || turn !== "red" || moving || forfeited) return;
    const value = choice === "blue" ? dice[0] : choice === "green" ? dice[1] : total;
    if (value === null) return;
    const token = playersRef.current.find(p => p.color === "red")?.tokens.find(t => t.id === id);
    if (!token || !legal(token, value, choice === "red")) return;
    setMoving(true);
    if (token.status === "home") {
      setPlayers(s => s.map(p => p.color === "red" ? { ...p, tokens: p.tokens.map(t => t.id === id ? { ...t, status: "track", progress: 0 } : t) } : p));
      await new Promise(r => window.setTimeout(r, 220));
    } else {
      for (let n = 1; n <= value; n++) {
        setPlayers(s => s.map(p => p.color === "red" ? { ...p, tokens: p.tokens.map(t => t.id === id ? { ...t, status: t.progress + 1 === FINISH_PROGRESS ? "finished" : "track", progress: t.progress + 1 } : t) } : p));
        await new Promise(r => window.setTimeout(r, 170));
      }
    }
    const after = playersRef.current.find(p => p.color === "red")?.tokens.find(t => t.id === id);
    if (after) setPlayers(s => killOneOpponent(s, "red", after));
    const nextUsed: [boolean, boolean] = [used[0] || choice === "blue" || choice === "red", used[1] || choice === "green" || choice === "red"];
    setUsed(nextUsed); setChoice(null); setMoving(false);
    if (nextUsed[0] && nextUsed[1]) {
      const extra = dice[0] === 6 || dice[1] === 6;
      clearDice();
      if (extra) setDoubleSixes(0); else nextTurn();
    }
  }

  useEffect(() => {
    if (turn === "red" || botBusy) return;
    setBotBusy(true); setChoice(null);
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      const a = Math.floor(Math.random() * 6) + 1;
      const b = Math.floor(Math.random() * 6) + 1;
      setDice([a, b]); setUsed([false, false]);
      if (a === 6 && b === 6) {
        setDoubleSixes(v => v + 1);
      } else setDoubleSixes(0);
      await new Promise(r => window.setTimeout(r, 550));
      if (cancelled) return;
      if (doubleSixes >= 2 && a === 6 && b === 6) { setBotBusy(false); nextTurn(); return; }
      setMoving(true);
      for (const value of [a, b]) {
        const state = playersRef.current;
        const id = chooseBotToken(state, turn, value);
        const token = id === null ? null : state.find(p => p.color === turn)?.tokens.find(t => t.id === id);
        if (!token || !isMovable(token, value)) continue;
        if (token.status === "home") {
          setPlayers(s => applyMove(s, turn, id!, value));
          await new Promise(r => window.setTimeout(r, 220));
        } else {
          for (let n = 1; n <= value; n++) {
            setPlayers(s => s.map(p => p.color === turn ? { ...p, tokens: p.tokens.map(t => t.id === id ? { ...t, progress: t.progress + 1, status: t.progress + 1 === FINISH_PROGRESS ? "finished" : "track" } : t) } : p));
            await new Promise(r => window.setTimeout(r, 170));
          }
        }
        const after = playersRef.current.find(p => p.color === turn)?.tokens.find(t => t.id === id);
        if (after) setPlayers(s => killOneOpponent(s, turn, after));
      }
      if (!cancelled) { setMoving(false); setBotBusy(false); setDice([null, null]); setUsed([false, false]); if (a === 6 || b === 6) setTurn(turn); else setTurn(NEXT[turn]); }
    }, 500);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [turn]);

  const chosen = choice === "blue" ? dice[0] : choice === "green" ? dice[1] : total;
  const canMove = chosen !== null && me.tokens.some(t => legal(t, chosen, choice === "red"));
  const homeSix = (choice === "blue" || choice === "green") && chosen === 6;
  const playerByColor = (c: PlayerColor) => players.find(p => p.color === c)?.tokens ?? [];

  return (
    <main className="game-page">
      <div className="game-stage">
        <div className="board-wrap">
          <div className="ludo-board">
            <div className="track">
              {Array.from({ length: 15 }, (_, row) => Array.from({ length: 15 }, (_, col) => ((row >= 6 && row <= 8) || (col >= 6 && col <= 8)) ? <TrackCell key={`${row}-${col}`} row={row} col={col} /> : <div key={`${row}-${col}`} className="empty-cell" />))}
            </div>
            <Home color="green" name="Player1" tokens={playerByColor("green")} />
            <Home color="yellow" name="Player2" tokens={playerByColor("yellow")} />
            <Home color="blue" name="Player4" tokens={playerByColor("blue")} />
            <Home color="red" name="Me" tokens={me.tokens}>
              <div className="tokens">{me.tokens.filter(t => t.status === "home").map(t => <button key={t.id} className={`token-slot token-home-button ${homeSix ? "token-movable-home" : ""}`} onClick={() => moveHuman(t.id)} disabled={!homeSix}><div className="token" style={{ background: COLORS.red }} /></button>)}</div>
            </Home>
            <div className="board-token-layer">
              {players.flatMap(p => p.tokens.map(t => {
                const pnt = tokenPos(p.color, t.progress);
                if (!pnt) return null;
                const movable = p.color === "red" && canMove && legal(t, chosen!, choice === "red");
                return <button key={`${p.color}-${t.id}`} className={`board-token ${movable ? "token-movable" : ""}`} style={{ ...pnt, background: COLORS[p.color] }} onClick={() => moveHuman(t.id)} disabled={!movable} />;
              }))}
            </div>
            <div className="center-home"><div className="center-backdrop">LUDO</div><div className="center-controls"><div className="dice-pair"><Die value={dice[0]} onClick={roll} disabled={rolling || botBusy} /><Die value={dice[1]} onClick={roll} disabled={rolling || botBusy} /></div></div></div>
          </div>
        </div>
        <div className="move-controls">
          <button className={`choice-token choice-blue ${choice === "blue" ? "chosen" : ""}`} disabled={turn !== "red" || !available[0] || !me.tokens.some(t => dice[0] !== null && legal(t, dice[0], false))} onClick={() => selectChoice("blue")}>{dice[0] ?? "?"}</button>
          <button className={`choice-token choice-green ${choice === "green" ? "chosen" : ""}`} disabled={turn !== "red" || !available[1] || !me.tokens.some(t => dice[1] !== null && legal(t, dice[1], false))} onClick={() => selectChoice("green")}>{dice[1] ?? "?"}</button>
          <button className={`choice-token choice-red ${choice === "red" ? "chosen" : ""}`} disabled={turn !== "red" || !available[0] || !available[1] || !me.tokens.some(t => total !== null && legal(t, total, true))} onClick={() => selectChoice("red")}>{total ?? "?"}</button>
        </div>
      </div>
    </main>
  );
}

function TrackCell({ row, col }: { row: number; col: number }) {
  // Six coloured exit squares sit directly against each home quadrant. The
  // inner five continue as HOME_LANES, creating the visible L/J entry shape.
  const green = col === 6 && row >= 0 && row <= 5;
  const yellow = row === 6 && col >= 9 && col <= 14;
  const red = col === 6 && row >= 9 && row <= 14;
  const blue = row === 8 && col >= 9 && col <= 14;
  let cls = "track-cell";
  if (green) cls += " green-path"; else if (yellow) cls += " yellow-path"; else if (red) cls += " red-path"; else if (blue) cls += " blue-path";
  return <div className={cls} />;
}
