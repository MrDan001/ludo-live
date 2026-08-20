"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  advanceToken,
  allFinished,
  createGame,
  FINISH_PROGRESS,
  isMovable,
  killOneOpponent,
  PlayerColor,
  PlayerState,
  chooseBotToken,
  applyMove,
} from "../lib/ludo";

const COLORS = { green: "#08a63b", yellow: "#ffad08", red: "#f21b2d", blue: "#1769e8" } as const;
type Choice = "blue" | "green" | "red" | null;
type DieValue = number | null;
type DiceState = [DieValue, DieValue];

// Only visible playable squares are counted. The four corner cells hidden by
// the centre box are intentionally skipped, so a token never cuts underneath it.
const TRACK_LENGTH = 48;
const BOARD_ROUTE: [number, number][] = [
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[7,1],[6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[1,7],[1,8],
  [2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[7,13],
  [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[13,7],
];
const HOME_LANES: Record<PlayerColor, [number, number][]> = {
  // Five visible home-lane cells. The sixth apparent cell is hidden by the centre box.
  red:[[13,7],[12,7],[11,7],[10,7],[9,7]],
  blue:[[7,1],[7,2],[7,3],[7,4],[7,5]],
  green:[[1,7],[2,7],[3,7],[4,7],[5,7]],
  yellow:[[7,13],[7,12],[7,11],[7,10],[7,9]],
};
const START_INDEX: Record<PlayerColor, number> = { red:0, blue:10, green:22, yellow:32 };
const BOT_ORDER: Record<PlayerColor, PlayerColor> = { red:"green", green:"yellow", yellow:"blue", blue:"red" };

function gridPosition(row:number,col:number){ return { left:`${col/15*100}%`, top:`${row/15*100}%` }; }
function tokenPosition(color:PlayerColor,progress:number){
  if(progress<0 || progress>FINISH_PROGRESS) return null;
  if(progress<TRACK_LENGTH){ const [row,col]=BOARD_ROUTE[(START_INDEX[color]+progress)%TRACK_LENGTH]; return gridPosition(row,col); }
  const lane=HOME_LANES[color][progress-TRACK_LENGTH];
  return lane ? gridPosition(lane[0],lane[1]) : null;
}

function Token({color,name}:{color:keyof typeof COLORS;name:string}){
  return <div className="token-slot"><div className="token" style={{background:COLORS[color]}} aria-label={`${name} token`}/></div>;
}
function Home({color,name,className,children,tokens}:{color:keyof typeof COLORS;name:string;className:string;children?:ReactNode;tokens?:PlayerState["tokens"]}){
  return <section className={`home ${className}`} style={{backgroundColor:COLORS[color]}}>
    <h2>{name}</h2>
    {children ?? <div className="tokens">{(tokens??[]).filter(t=>t.status==="home").map(t=><Token key={t.id} color={color} name={name}/>)}</div>}
  </section>;
}
function TrackCell({row,col}:{row:number;col:number}){
  const green=col===7&&row>=1&&row<=5, yellow=row===7&&col>=9&&col<=13, red=col===7&&row>=9&&row<=13, blue=row===7&&col>=1&&col<=5;
  const start=(row===6&&col===1)||(row===1&&col===8)||(row===8&&col===13)||(row===13&&col===6);
  const safe=new Set(["6-2","2-8","8-12","12-6"]).has(`${row}-${col}`);
  let c="track-cell";
  if(green)c+=" green-path"; else if(yellow)c+=" yellow-path"; else if(red)c+=" red-path"; else if(blue)c+=" blue-path"; else if(safe)c+=" safe-cell"; else if(start)c+=" start-cell";
  const mark=safe?"★":row===7&&col===1?"→":row===1&&col===7?"↓":row===13&&col===7?"↑":row===7&&col===13?"←":"";
  return <div className={c}>{mark}</div>;
}
function Die({value,rolling,onClick,label}:{value:DieValue;rolling:boolean;onClick:()=>void;label:string}){
  return <button className={`die ${rolling?"die-rolling":""}`} onClick={onClick} disabled={rolling} aria-label={label}>
    {value===null?<span className="die-question">?</span>:<span className={`pip-grid pips-${value}`}>{Array.from({length:value},(_,i)=><i key={i}/>)}</span>}
  </button>;
}
function ChoiceToken({color,value,selected,disabled,label,onClick}:{color:"blue"|"green"|"red";value:number|null;selected:boolean;disabled:boolean;label:string;onClick:()=>void}){
  return <button className={`choice-token choice-${color} ${selected?"chosen":""}`} onClick={onClick} disabled={disabled} aria-label={label}>{value??"?"}</button>;
}
function MovableToken({token,color,movable,onClick}:{token:PlayerState["tokens"][number];color:PlayerColor;movable:boolean;onClick:()=>void}){
  const pos=tokenPosition(color,token.progress); if(!pos)return null;
  return <button className={`board-token board-token-${color} ${movable?"token-movable":""}`} style={{...pos,background:COLORS[color]}} onClick={onClick} disabled={!movable} aria-label={`${color} token ${token.id+1}`}></button>;
}

export default function HomePage(){
  const [players,setPlayers]=useState<PlayerState[]>(()=>createGame());
  const [turn,setTurn]=useState<PlayerColor>("red");
  const [dice,setDice]=useState<DiceState>([null,null]);
  const [used,setUsed]=useState<[boolean,boolean]>([false,false]);
  const [rolling,setRolling]=useState(false);
  const [moving,setMoving]=useState(false);
  const [choice,setChoice]=useState<Choice>(null);
  const [doubleSixes,setDoubleSixes]=useState(0);
  const [message,setMessage]=useState("");
  const [botBusy,setBotBusy]=useState(false);
  const [hasStarted,setHasStarted]=useState(false);
  const [botCycle,setBotCycle]=useState(0);
  const playersRef=useRef(players);
  playersRef.current=players;

  const me=players.find(p=>p.color==="red")!;
  const available=useMemo(()=>dice.map((v,i)=>v!==null&&!used[i]),[dice,used]);
  const total=dice[0]!==null&&dice[1]!==null?dice[0]+dice[1]:null;
  const forfeits=doubleSixes>=3;
  const canRoll=turn==="red"&&!rolling&&!moving&&!botBusy&&!forfeits&&(dice[0]===null||(used[0]&&used[1]));

  function clearDice(){ setDice([null,null]); setUsed([false,false]); setChoice(null); }
  function nextTurn(){ clearDice(); setDoubleSixes(0); setTurn(BOT_ORDER[turn]); }

  function rollDice(){
    if(!canRoll)return;
    setRolling(true); setChoice(null);
    window.setTimeout(()=>{
      const a=!hasStarted?6:Math.floor(Math.random()*6)+1;
      const b=Math.floor(Math.random()*6)+1;
      const next=a===6&&b===6?doubleSixes+1:0;
      setHasStarted(true); setDice([a,b]); setUsed([false,false]); setDoubleSixes(next); setRolling(false);
      setMessage(next>=3?"Three double-sixes — turn forfeited":"Choose a die, then choose a highlighted token");
    },420);
  }

  function canPlayRoll(token:PlayerState["tokens"][number], roll:number, merged:boolean=false){
    // A merged 6 is a movement of six spaces, but it is NOT a valid home exit.
    if(merged && token.status==="home") return false;
    return isMovable(token,roll);
  }

  function choose(v:Choice){
    if(turn!=="red"||v===null||moving||forfeits)return;
    if(v==="blue"&&!available[0])return;
    if(v==="green"&&!available[1])return;
    if(v==="red"&&!(available[0]&&available[1]))return;
    const roll=v==="blue"?dice[0]:v==="green"?dice[1]:total;
    if(roll===null||!me.tokens.some(t=>canPlayRoll(t,roll,v==="red")))return;
    setChoice(v);
  }

  function updateToken(color:PlayerColor,id:number,tokenUpdater:(token:PlayerState["tokens"][number])=>PlayerState["tokens"][number]){
    setPlayers(current=>current.map(p=>p.color===color?{...p,tokens:p.tokens.map(t=>t.id===id?tokenUpdater(t):t)}:p));
  }

  async function animateMove(color:PlayerColor,id:number,roll:number){
    const player=playersRef.current.find(p=>p.color===color); const original=player?.tokens.find(t=>t.id===id);
    if(!original || !isMovable(original,roll))return false;
    setMoving(true);
    if(original.status==="home"){
      updateToken(color,id,t=>({...t,status:"track",progress:0}));
      await new Promise(r=>window.setTimeout(r,280));
    } else {
      for(let step=1;step<=roll;step++){
        const nextProgress=original.progress+step;
        updateToken(color,id,t=>({...t,progress:nextProgress,status:nextProgress===FINISH_PROGRESS?"finished":"track"}));
        await new Promise(r=>window.setTimeout(r,170));
      }
    }
    setMoving(false);
    return true;
  }

  async function moveToken(id:number){
    if(!choice||forfeits||turn!=="red"||moving)return;
    const roll=choice==="blue"?dice[0]:choice==="green"?dice[1]:total;
    if(roll===null)return;
    const merged=choice==="red";
    const token=me.tokens.find(t=>t.id===id); if(!token||!canPlayRoll(token,roll,merged))return;
    const ok=await animateMove("red",id,roll); if(!ok)return;
    const current=playersRef.current.find(p=>p.color==="red")?.tokens.find(t=>t.id===id);
    if(current){
      setPlayers(state=>killOneOpponent(state,"red",current));
      if(current.status==="finished") setMessage("Token reached home!");
    }
    const nextUsed:[boolean,boolean]=[used[0],used[1]];
    if(choice==="blue"||choice==="red")nextUsed[0]=true;
    if(choice==="green"||choice==="red")nextUsed[1]=true;
    setUsed(nextUsed); setChoice(null);
    const finishedPlayer=playersRef.current.find(p=>p.color==="red");
    if(finishedPlayer && allFinished(finishedPlayer)){setMessage("You finished all four tokens!");return;}
    if(nextUsed[0]&&nextUsed[1]){
      const extra=dice[0]===6||dice[1]===6;
      clearDice();
      if(extra){setDoubleSixes(0);setMessage("Six — roll again");}
      else nextTurn();
    }
  }

  useEffect(()=>{
    if(turn!=="red"||moving||rolling||forfeits||dice[0]===null)return;
    const can0=available[0]&&me.tokens.some(t=>isMovable(t,dice[0]!));
    const can1=available[1]&&me.tokens.some(t=>isMovable(t,dice[1]!));
    const next:[boolean,boolean]=[used[0]||(!can0&&available[0]),used[1]||(!can1&&available[1])];
    if(next[0]!==used[0]||next[1]!==used[1])setUsed(next);
    if(next[0]&&next[1]){
      const extra=dice[0]===6||dice[1]===6;
      const timer=window.setTimeout(()=>{clearDice();if(extra){setDoubleSixes(0);setMessage("Six — roll again");}else nextTurn();},220);
      return()=>window.clearTimeout(timer);
    }
  },[turn,moving,rolling,forfeits,dice,used,available,me.tokens]);

  useEffect(()=>{
    if(turn!=="red"){
      setBotBusy(true); setChoice(null); setMessage("");
      let cancelled=false;
      const rollTimer=window.setTimeout(async()=>{
        if(cancelled)return;
        const a=Math.floor(Math.random()*6)+1,b=Math.floor(Math.random()*6)+1;
        const nextDouble=a===6&&b===6?doubleSixes+1:0;
        setDice([a,b]); setUsed([false,false]); setDoubleSixes(nextDouble);
        await new Promise(r=>window.setTimeout(r,650));
        if(cancelled)return;
        if(nextDouble>=3){
          setMessage("Bot forfeits after three double-sixes");
          await new Promise(r=>window.setTimeout(r,600));
          if(!cancelled){setBotBusy(false);nextTurn();}
          return;
        }
        setMoving(true);
        const rolls=[a,b];
        for(const roll of rolls){
          const state=playersRef.current;
          const id=chooseBotToken(state,turn,roll);
          if(id===null)continue;
          const token=state.find(p=>p.color===turn)?.tokens.find(t=>t.id===id);
          if(!token||!isMovable(token,roll))continue;
          if(token.status==="home"){
            setPlayers(s=>applyMove(s,turn,id,roll));
            await new Promise(r=>window.setTimeout(r,360));
          } else {
            for(let step=1;step<=roll;step++){
              setPlayers(s=>s.map(p=>p.color===turn?{...p,tokens:p.tokens.map(t=>t.id===id?{...t,progress:t.progress+1,status:t.progress+1===FINISH_PROGRESS?"finished":"track"}:t)}:p));
              await new Promise(r=>window.setTimeout(r,170));
              if(cancelled)break;
            }
            const after=playersRef.current.find(p=>p.color===turn)?.tokens.find(t=>t.id===id);
            if(after)setPlayers(s=>killOneOpponent(s,turn,after));
          }
        }
        if(cancelled)return;
        setMoving(false); setBotBusy(false); setDice([null,null]); setUsed([false,false]);
        if(a===6||b===6){setDoubleSixes(0);setMessage("Bot rolled a six");setBotCycle(c=>c+1);}
        else {setDoubleSixes(0);setTurn(BOT_ORDER[turn]);}
      },500);
      return()=>{cancelled=true;window.clearTimeout(rollTimer);};
    }
  },[turn,botCycle]);

  const chosenRoll=choice==="blue"?dice[0]:choice==="green"?dice[1]:total;
  const canMoveAny=chosenRoll!==null&&me.tokens.some(t=>canPlayRoll(t,chosenRoll,choice==="red"));
  const homeSixMovable=turn==="red"&&(choice==="blue"||choice==="green")&&chosenRoll===6&&!forfeits&&!moving;

  return <main className="game-page"><div className="game-stage"><div className="board-wrap"><div className="ludo-board" aria-label="Ludo board">
    <div className="track" aria-hidden="true">{Array.from({length:15},(_,row)=>Array.from({length:15},(_,col)=>{const cross=(row>=6&&row<=8)||(col>=6&&col<=8);return cross?<TrackCell key={`${row}-${col}`} row={row} col={col}/>:<div key={`${row}-${col}`} className="empty-cell"/>;}))}</div>
    <Home color="green" name="Player1" className="home-green" tokens={players.find(p=>p.color==="green")?.tokens}/>
    <Home color="yellow" name="Player2" className="home-yellow" tokens={players.find(p=>p.color==="yellow")?.tokens}/>
    <Home color="red" name="Me" className="home-red"><div className="tokens">{me.tokens.filter(t=>t.status==="home").map(t=><button key={t.id} type="button" className={`token-slot token-home-button ${homeSixMovable&&isMovable(t,6)?"token-movable-home":""}`} onClick={()=>moveToken(t.id)} disabled={!homeSixMovable||!isMovable(t,6)} aria-label={`Red token ${t.id+1}`}><div className="token" style={{background:COLORS.red}}/></button>)}</div></Home>
    <Home color="blue" name="Player4" className="home-blue" tokens={players.find(p=>p.color==="blue")?.tokens}/>
    <div className="board-token-layer" aria-label="Tokens">{players.flatMap(p=>p.tokens.map(t=><MovableToken key={`${p.color}-${t.id}`} token={t} color={p.color} movable={p.color==="red"&&canMoveAny&&chosenRoll!==null&&canPlayRoll(t,chosenRoll,choice==="red")} onClick={()=>moveToken(t.id)}/>))}</div>
    <div className="center-home" aria-label="Dice area"><div className="center-backdrop" aria-hidden="true">LUDO</div><div className="center-controls"><div className="dice-pair"><Die value={dice[0]} rolling={rolling||botBusy} onClick={rollDice} label="Roll first die"/><Die value={dice[1]} rolling={rolling||botBusy} onClick={rollDice} label="Roll second die"/></div></div></div>
  </div></div>
  <div className="move-controls" aria-label="Choose a move value"><ChoiceToken color="blue" value={dice[0]} selected={choice==="blue"} disabled={turn!=="red"||!available[0]||forfeits||botBusy||moving||!me.tokens.some(t=>dice[0]!==null&&isMovable(t,dice[0]))} label="Play first die" onClick={()=>choose("blue")}/><ChoiceToken color="green" value={dice[1]} selected={choice==="green"} disabled={turn!=="red"||!available[1]||forfeits||botBusy||moving||!me.tokens.some(t=>dice[1]!==null&&isMovable(t,dice[1]))} label="Play second die" onClick={()=>choose("green")}/><ChoiceToken color="red" value={total} selected={choice==="red"} disabled={turn!=="red"||!(available[0]&&available[1])||forfeits||botBusy||moving||!me.tokens.some(t=>total!==null&&canPlayRoll(t,total,true))} label="Merge both dice" onClick={()=>choose("red")}/></div>
  </div></main>;
}
