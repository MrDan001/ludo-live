"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createGame, FINISH_PROGRESS, isMovable, killOneOpponent, chooseBotToken, applyMove, PlayerColor, PlayerState } from "../lib/ludo";

const COLORS = { green: "#08a63b", yellow: "#ffad08", red: "#f21b2d", blue: "#1769e8" } as const;
type Choice = "blue" | "green" | "red" | null;
type Dice = [number | null, number | null];

const BOARD_ROUTE: [number, number][] = [
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[7,1],[6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],
  [7,13],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6]
];
const TRACK_LENGTH = BOARD_ROUTE.length;

// All players use the same clockwise shared-track direction as red.
// Their exits are the four arm-entry squares: red bottom, green top,
// yellow right, blue left. Progress +1 always follows BOARD_ROUTE clockwise.
const START_INDEX: Record<PlayerColor, number> = { red: 0, green: 17, yellow: 35, blue: 11 };
const HOME_LANES: Record<PlayerColor, [number, number][]> = {
  red: [[13,7],[12,7],[11,7],[10,7],[9,7]],
  green: [[4,7],[3,7],[2,7],[1,7],[0,7]],
  yellow: [[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue: [[7,2],[7,3],[7,4],[7,5],[7,6]],
};
const NEXT: Record<PlayerColor, PlayerColor> = { red: "green", green: "yellow", yellow: "blue", blue: "red" };

function pos(row: number, col: number) { return { left: `${((col + 0.5) / 15) * 100}%`, top: `${((row + 0.5) / 15) * 100}%` }; }
function tokenPos(color: PlayerColor, progress: number) {
  if (progress < 0 || progress > FINISH_PROGRESS) return null;
  if (progress < TRACK_LENGTH) { const [r, c] = BOARD_ROUTE[(START_INDEX[color] + progress) % TRACK_LENGTH]; return pos(r, c); }
  const lane = HOME_LANES[color][progress - TRACK_LENGTH];
  return lane ? pos(...lane) : null;
}
function Token({color}:{color:PlayerColor}){return <div className="token-slot"><div className="token" style={{background:COLORS[color]}}/></div>}
function Home({color,name,tokens,children}:{color:PlayerColor;name:string;tokens:PlayerState["tokens"];children?:ReactNode}){return <section className={`home home-${color}`} style={{background:COLORS[color]}}><h2>{name}</h2>{children??<div className="tokens">{tokens.filter(t=>t.status==="home").map(t=><Token key={t.id} color={color}/>)}</div>}</section>}
function Die({value,onClick,disabled}:{value:number|null;onClick:()=>void;disabled:boolean}){return <button className="die" onClick={onClick} disabled={disabled}>{value===null?"?":<span className={`pip-grid pips-${value}`}>{Array.from({length:value},(_,i)=><i key={i}/>)}</span>}</button>}
export default function HomePage(){
 const[players,setPlayers]=useState<PlayerState[]>(()=>createGame());const[turn,setTurn]=useState<PlayerColor>("red");const[dice,setDice]=useState<Dice>([null,null]);const[used,setUsed]=useState<[boolean,boolean]>([false,false]);const[choice,setChoice]=useState<Choice>(null);const[moving,setMoving]=useState(false);const[rolling,setRolling]=useState(false);const[doubleSixes,setDoubleSixes]=useState(0);const[started,setStarted]=useState(false);const[botBusy,setBotBusy]=useState(false);const[botCycle,setBotCycle]=useState(0);const playersRef=useRef(players);const turnRef=useRef(turn);const doubleSixesRef=useRef(doubleSixes);playersRef.current=players;turnRef.current=turn;doubleSixesRef.current=doubleSixes;
 const me=players.find(p=>p.color==="red")!;const available=useMemo(()=>dice.map((v,i)=>v!==null&&!used[i]),[dice,used]);const total=dice[0]!==null&&dice[1]!==null?dice[0]+dice[1]:null;const forfeited=doubleSixes>=3;
 function clearDice(){setDice([null,null]);setUsed([false,false]);setChoice(null)} function nextTurn(from:PlayerColor=turnRef.current){clearDice();setDoubleSixes(0);setTurn(NEXT[from])}
 function legal(token:PlayerState["tokens"][number],roll:number,merged:boolean){return!(merged&&token.status==="home")&&isMovable(token,roll)}
 function roll(){if(turn!=="red"||rolling||moving||botBusy||forfeited||!(dice[0]===null||(used[0]&&used[1])))return;setRolling(true);setChoice(null);window.setTimeout(()=>{const a=!started?6:Math.floor(Math.random()*6)+1,b=Math.floor(Math.random()*6)+1;setStarted(true);setDice([a,b]);setUsed([false,false]);setDoubleSixes(prev=>a===6&&b===6?prev+1:0);setRolling(false)},350)}
 function selectChoice(c:Choice){if(turn!=="red"||moving||forfeited||c===null)return;if(c==="blue"&&!available[0])return;if(c==="green"&&!available[1])return;if(c==="red"&&!(available[0]&&available[1]))return;const value=c==="blue"?dice[0]:c==="green"?dice[1]:total;if(value===null||!me.tokens.some(t=>legal(t,value,c==="red")))return;setChoice(c)}
 async function moveHuman(id:number){if(!choice||turn!=="red"||moving||forfeited)return;const selectedChoice=choice,value=selectedChoice==="blue"?dice[0]:selectedChoice==="green"?dice[1]:total;if(value===null)return;const token=playersRef.current.find(p=>p.color==="red")?.tokens.find(t=>t.id===id);if(!token||!legal(token,value,selectedChoice==="red"))return;setMoving(true);try{for(let n=1;n<=value;n++){if(token.status==="home"&&n>1)break;setPlayers(s=>s.map(p=>p.color==="red"?{...p,tokens:p.tokens.map(t=>t.id===id?{...t,status:"track",progress:t.status==="home"?0:t.progress+1}:t)}:p));await new Promise(r=>window.setTimeout(r,170))}const after=playersRef.current.find(p=>p.color==="red")?.tokens.find(t=>t.id===id);if(after)setPlayers(s=>killOneOpponent(s,"red",after));const nextUsed:[boolean,boolean]=[used[0]||selectedChoice==="blue"||selectedChoice==="red",used[1]||selectedChoice==="green"||selectedChoice==="red"];setUsed(nextUsed);setChoice(null);if(nextUsed[0]&&nextUsed[1]){const extra=dice[0]===6||dice[1]===6;clearDice();if(extra)setDoubleSixes(0);else nextTurn("red")}}finally{setMoving(false)}}
 useEffect(()=>{if(turn==="red"||botBusy)return;setBotBusy(true);setChoice(null);let cancelled=false;const botColor=turn;const timer=window.setTimeout(async()=>{try{if(cancelled)return;const a=Math.floor(Math.random()*6)+1,b=Math.floor(Math.random()*6)+1,isDoubleSix=a===6&&b===6,nextDoubleCount=isDoubleSix?doubleSixesRef.current+1:0;setDice([a,b]);setUsed([false,false]);setDoubleSixes(nextDoubleCount);await new Promise(r=>window.setTimeout(r,550));if(cancelled)return;if(nextDoubleCount>=3){setMoving(false);setBotBusy(false);nextTurn(botColor);return}setMoving(true);for(const value of [a,b] as const){if(cancelled) return;const state=playersRef.current,id=chooseBotToken(state,botColor,value);if(id===null)continue;const token=state.find(p=>p.color===botColor)?.tokens.find(t=>t.id===id);if(!token||!isMovable(token,value))continue;setPlayers(s=>applyMove(s,botColor,id,value));await new Promise(r=>window.setTimeout(r,300))}if(!cancelled){setMoving(false);setBotBusy(false);setDice([null,null]);setUsed([false,false]);if(a===6||b===6){setDoubleSixes(0);setBotCycle(v=>v+1)}else nextTurn(botColor)}}finally{if(!cancelled){setMoving(false);setBotBusy(false)}}},700);return()=>{cancelled=true;window.clearTimeout(timer)}},[turn,botCycle]);
 const redTokens=me.tokens;return <main className="game"><div className="board-wrap"><div className="board"><Home color="green" name="GREEN" tokens={players.find(p=>p.color==="green")?.tokens??[]}/><Home color="red" name="RED" tokens={redTokens}/><Home color="yellow" name="YELLOW" tokens={players.find(p=>p.color==="yellow")?.tokens??[]}/><Home color="blue" name="BLUE" tokens={players.find(p=>p.color==="blue")?.tokens??[]}/>{players.flatMap(p=>p.tokens.filter(t=>t.status!=="home").map(t=>{const pnt=tokenPos(p.color,t.progress);return pnt?<button key={`${p.color}-${t.id}`} className={`moved-token moved-${p.color}`} style={pnt} onClick={()=>p.color==="red"&&moveHuman(t.id)}><Token color={p.color}/></button>:null}))}</div></div><div className="controls"><Die value={dice[0]} onClick={()=>selectChoice("blue")} disabled={turn!=="red"||!available[0]||moving||rolling}/><Die value={dice[1]} onClick={()=>selectChoice("green")} disabled={turn!=="red"||!available[1]||moving||rolling}/><button onClick={roll} disabled={turn!=="red"||rolling||moving||botBusy}>ROLL</button>{choice&&<button onClick={()=>{if(choice==="blue")selectChoice("blue");else if(choice==="green")selectChoice("green");else selectChoice("red")}}>SELECT MOVE</button>}</div></main>}
