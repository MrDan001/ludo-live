"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EquippedAvatar from "../_components/EquippedAvatar";
import LudoBoard, { BOARD_PALETTES, type BoardThemeId, type DemoToken } from "../_components/LudoBoard";
import { FINISH_PROGRESS, getTokenCell, tokenState } from "../../lib/canonicalLudoBoard";
import { canMove, hasWon, moveToken, rollDice, nextProgress } from "../../lib/ludoEngine";
import { getWorldMode, type WorldMode } from "./world-data";
import "./world.css";

type Turn="human"|"bot"; type Face=1|2|3|4|5|6; type User={username:string;level:number;equippedBoard?:string};
const HUMAN=["red","yellow"] as const; const BOT=["green","blue"] as const;
const PIPS:Record<Face,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const makeTokens=():DemoToken[]=>(["green","yellow","red","blue"] as DemoToken["color"][]).flatMap(function(color){return Array.from({length:4},function(_,id){return {color:color,id:id,position:0,state:"yard" as const};});});
const sameToken=(a:DemoToken,b:DemoToken)=>a.color===b.color&&a.id===b.id;
const applyMove=(tokens:DemoToken[],token:DemoToken,dice:Face)=>{
  const r=moveToken(token as any,dice as any,tokens as any);
  if(!r.moved||!r.token)return null;
  const capturedKeys=new Set((r.captured||[]).map(function(item:any){return item.color+":"+item.id;}));
  return {next:tokens.map(function(item){
    if(sameToken(item,token)) return r.token as DemoToken;
    if(capturedKeys.has(item.color+":"+item.id)) return {...item,position:0,state:"yard" as const};
    return item;
  }),captured:(r.captured||[]).length>0};
};

function Dice({value,rolling,disabled,onRoll}:{value:Face;rolling:boolean;disabled:boolean;onRoll:()=>void}){return <button className={"world-dice-button "+(rolling?"rolling":"")} disabled={disabled||rolling} onClick={onRoll} aria-label="Roll dice"><span className="world-dice-shadow"/><span className="world-cube"><span className="world-cube-inner">{([0,1,2,3,4,5] as number[]).map(function(face){return <span key={face} className={"world-dice-face face-"+face}>{Array.from({length:9},function(_,i){return <i key={i}>{PIPS[rolling?6:value].includes(i)?<b/>:null}</i>;})}</span>;})}</span></span></button>;}

function WorldBoard({theme,tokens,legal,onToken}:{theme:BoardThemeId;tokens:DemoToken[];legal:string[];onToken:(color:DemoToken["color"],id:number)=>void}){
  const palette=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;
  const legalSet=useMemo(function(){return new Set(legal);},[legal]);

  const finishSlots:Array<[string,string]>=[
    ["44%","44%"],["48%","44%"],["44%","48%"],["48%","48%"],
    ["52%","44%"],["56%","44%"],["52%","48%"],["56%","48%"],
    ["44%","52%"],["48%","52%"],["44%","56%"],["48%","56%"],
    ["52%","52%"],["56%","52%"],["52%","56%"],["56%","56%"]
  ];
  const finishOrder:any={red:0,yellow:1,green:2,blue:3};

  const yardCenters:any={
    green:[[13.5,13.5],[13.5,26.5],[26.5,13.5],[26.5,26.5]],
    yellow:[[13.5,73.5],[13.5,86.5],[26.5,73.5],[26.5,86.5]],
    red:[[73.5,13.5],[73.5,26.5],[86.5,13.5],[86.5,26.5]],
    blue:[[73.5,73.5],[73.5,86.5],[86.5,73.5],[86.5,86.5]]
  };

  const placed=useMemo(function(){
    const raw=tokens.map(function(token){
      const p=Number(token.position)||0;
      if(p===FINISH_PROGRESS)return null;
      const state=tokenState(p);
      if(state==="yard"){
        const c=yardCenters[token.color][token.id];
        return {token,left:c[1]+"%",top:c[0]+"%",key:"yard:"+token.color};
      }
      const cell=getTokenCell(token.color,p);
      if(!cell)return null;
      return {
        token,
        left:((cell[1]+.5)*100/15)+"%",
        top:((cell[0]+.5)*100/15)+"%",
        key:cell[0]+"|"+cell[1]
      };
    }).filter(Boolean) as Array<{token:DemoToken;left:string;top:string;key:string}>;

    const counts:Record<string,number>={};
    const totals:Record<string,number>={};
    raw.forEach(function(item){totals[item.key]=(totals[item.key]||0)+1;});
    return raw.map(function(item){
      const index=counts[item.key]||0;
      counts[item.key]=index+1;
      return {...item,index,count:totals[item.key],state:tokenState(Number(item.token.position)||0)};
    });
  },[tokens]);

  const stackOffset=function(index:number,count:number){
    if(count<=1)return [0,0];
    // Keep every stack inside a standard 15x15 cell even with the larger track tokens.
    const patterns:{[key:string]:number[][]}={
      2:[[-0.92,0],[0.92,0]],
      3:[[-0.9,-0.82],[0.9,-0.82],[0,0.82]],
      4:[[-0.9,-0.82],[0.9,-0.82],[-0.9,0.82],[0.9,0.82]]
    };
    const p=patterns[String(count)]||patterns["4"];
    return p[index%p.length];
  };

  const finished=tokens.filter(function(t){return Number(t.position)===FINISH_PROGRESS;});

  return <div className="world-board" style={{"--world-accent":palette.accent} as React.CSSProperties}>
    <LudoBoard theme={theme} style={{width:"100%",height:"100%"}} demoTokens={[]} onTokenClick={function(){}}/>
    <div className="world-token-layer">
      {placed.map(function(item){
        const token=item.token;
        const isLegal=legalSet.has(token.color+":"+token.id);
        const o=stackOffset(item.index,item.count);
        const sizeClass=item.state==="yard"?"yard":"track";
        return <button
          key={token.color+":"+token.id}
          type="button"
          className={"world-token "+sizeClass+(isLegal?" legal":"")}
          style={{
            left:"calc("+item.left+" + "+o[0]+"%)",
            top:"calc("+item.top+" + "+o[1]+"%)",
            background:(palette as any)[token.color],
            color:(palette as any)[token.color]
          }}
          onClick={function(){onToken(token.color,token.id);}}
          aria-label={isLegal?token.color+" token — move":token.color+" token"}
        >{isLegal&&<span className="world-token-ring"/>}</button>;
      })}
      {finished.map(function(token){
        const slotIndex=(finishOrder[token.color]||0)*4+token.id;
        const slot=finishSlots[slotIndex]||finishSlots[0];
        return <div
          key={"finished:"+token.color+":"+token.id}
          className="world-finished-token"
          style={{left:slot[0],top:slot[1],background:(palette as any)[token.color]}}
          aria-hidden="true"
        />;
      })}
    </div>
  </div>;
}

export default function WorldMatch({mode}:{mode:WorldMode}){
  const config=getWorldMode(mode); const [user,setUser]=useState<User|null>(null); const [theme,setTheme]=useState<BoardThemeId>("classic"); const [tokens,setTokens]=useState<DemoToken[]>(makeTokens); const tokensRef=useRef<DemoToken[]>(tokens); const [turn,setTurn]=useState<Turn>("human"); const [lastDice,setLastDice]=useState<Face|null>(null); const [pendingDice,setPendingDice]=useState<Face|null>(null); const [rolling,setRolling]=useState(false); const [seconds,setSeconds]=useState(config.turnSeconds||0); const [message,setMessage]=useState("Roll the dice to begin."); const [over,setOver]=useState(false); const [series,setSeries]=useState({human:0,bot:0}); const [round,setRound]=useState(1); const botBusy=useRef(false);
  useEffect(function(){tokensRef.current=tokens;},[tokens]);
  useEffect(function(){fetch("/api/auth",{cache:"no-store"}).then(function(r){return r.json();}).then(function(d){if(d&&d.user)setUser({username:String(d.user.username||"Player"),level:Number(d.user.level)||1,equippedBoard:String(d.user.equippedBoard||"")});setTheme(String((d&&d.user&&d.user.equippedBoard)||"classic") as BoardThemeId);}).catch(function(){});fetch("/api/customization",{cache:"no-store"}).then(function(r){return r.json();}).then(function(d){if(d&&d.equippedBoard)setTheme(d.equippedBoard as BoardThemeId);}).catch(function(){});},[]);
  const restartRound=()=>{const fresh=makeTokens();tokensRef.current=fresh;setTokens(fresh);setPendingDice(null);setLastDice(null);setTurn("human");setMessage("Next round — roll the dice.");setSeconds(config.turnSeconds||0);};
  useEffect(function(){if(!config.turnSeconds||turn!=="human"||pendingDice!==null||over)return;setSeconds(config.turnSeconds);const id=window.setInterval(function(){setSeconds(function(v){if(v<=1){window.clearInterval(id);setMessage("Time expired — your turn was skipped.");setTurn("bot");return 0;}return v-1;});},1000);return function(){window.clearInterval(id);};},[config.turnSeconds,turn,pendingDice,over]);
  const animateMove=async function(token:DemoToken,rolled:Face,actor:"human"|"bot"){
    const target=nextProgress(Number(token.position) as any,rolled as any);
    if(target===null)return false;
    setPendingDice(null);setRolling(true);
    let step=Number(token.position)||0;
    while(step<target){
      await new Promise(function(resolve){window.setTimeout(resolve,170);});
      step+=1;
      const current=tokensRef.current.map(function(item){return sameToken(item,token)?{...item,position:step,state:tokenState(step) as DemoToken["state"]}:item;});
      tokensRef.current=current;setTokens(current);
    }
    const result=applyMove(tokensRef.current,token,rolled);
    if(!result)return false;
    tokensRef.current=result.next;setTokens(result.next);setRolling(false);
    if(result.captured)setMessage(actor==="human"?"Capture! Opposing token returned to its yard.":"World AI captured a token.");
    if(target===FINISH_PROGRESS)setMessage(actor==="human"?"Finished! Your token is in the World center.":"World AI finished a token.");
    return true;
  };

  useEffect(function(){if(turn!=="bot"||over||botBusy.current)return;botBusy.current=true;let active=true;(async function(){
    let again=true;
    while(active&&again&&!over){
      again=false;
      await new Promise(function(r){window.setTimeout(r,mode==="boss"?420:620);});
      if(!active)return;
      setRolling(true);
      await new Promise(function(r){window.setTimeout(r,520);});
      if(!active)return;
      const rolled=rollDice() as Face;
      setLastDice(rolled);
      setPendingDice(rolled);
      setRolling(false);
      setMessage(mode==="boss"?"World boss rolled "+rolled+".":"World AI rolled "+rolled+".");
      await new Promise(function(r){window.setTimeout(r,360);});
      if(!active)return;
      const snap=tokensRef.current;
      const legal=snap.filter(function(t){return BOT.includes(t.color as any)&&canMove(snap,t as any,rolled as any);});
      if(!legal.length){
        setPendingDice(null);
        setMessage("No legal move — your turn.");
        setTurn("human");
        return;
      }
      const choice=mode==="boss"?legal.slice().sort(function(a,b){return Number(b.position)-Number(a.position);})[0]:legal[Math.floor(Math.random()*legal.length)];
      const moved=await animateMove(choice,rolled,"bot");
      if(!moved){
        setPendingDice(null);
        setTurn("human");
        return;
      }
      if(hasWon(tokensRef.current as any,BOT as any)){
        const next={human:series.human,bot:series.bot+1};
        if(config.seriesToWin&&next.bot<config.seriesToWin){
          setSeries(next);
          setRound(function(v){return v+1;});
          window.setTimeout(restartRound,850);
        }else{
          setSeries(next);
          setOver(true);
          setTurn("bot");
          setMessage("World AI wins the match.");
        }
        return;
      }
      again=rolled===6||(mode==="chaos"&&Math.random()<0.35);
      if(again) setMessage("World AI rolled "+rolled+". It gets another roll.");
      else { setTurn("human"); setMessage("Your turn — roll quickly."); }
    }
  })().finally(function(){botBusy.current=false;});return function(){active=false;};},[turn,over,mode]);
  const legal=useMemo(function(){if(pendingDice===null||turn!=="human"||over)return [];return tokens.filter(function(t){return HUMAN.includes(t.color as any)&&canMove(tokens,t as any,pendingDice as any);}).map(function(t){return t.color+":"+t.id;});},[pendingDice,turn,over,tokens]);
  const rollHuman=()=>{if(turn!=="human"||pendingDice!==null||rolling||over||(user&&user.level<5))return;setRolling(true);window.setTimeout(function(){const next=rollDice() as Face;setLastDice(next);setPendingDice(next);setRolling(false);const options=tokens.filter(function(t){return HUMAN.includes(t.color as any)&&canMove(tokens,t as any,next as any);});if(!options.length){setMessage("You rolled "+next+". No legal move — opponent turn.");window.setTimeout(function(){setPendingDice(null);setTurn("bot");},420);}else setMessage("You rolled "+next+". Tap a glowing token.");},520);};
  const moveHuman=async(color:DemoToken["color"],id:number)=>{
    if(turn!=="human"||pendingDice===null||over||rolling)return;
    const token=tokensRef.current.find(function(item){return item.color===color&&item.id===id;});
    if(!token||!canMove(tokensRef.current,token as any,pendingDice as any))return;
    const rolled=pendingDice;
    const moved=await animateMove(token,rolled,"human");
    if(!moved)return;
    if(hasWon(tokensRef.current as any,HUMAN as any)){setOver(true);setTurn("human");setMessage("🏆 You won Ludo World!");return;}
    const extra=rolled===6||(mode==="chaos"&&Math.random()<0.35);
    setTurn(extra?"human":"bot");setMessage(extra?"Six! Roll again.":"World AI is up next.");
  };

  if(!user)return <main className="world-shell world-center"><div className="world-loading-mark">🔐</div><h1>Sign in required</h1><p>Ludo World is part of Ludo Live.</p><a className="world-primary" href="/login">Go to Login</a></main>;
  if(user.level<5)return <main className="world-shell world-center"><div className="world-loading-mark">🔒</div><h1>World locked</h1><p>Reach Level 5 to unlock Ludo World.</p><a className="world-primary" href="/ludo-world">Back to World</a></main>;
  return <main className="world-shell world-match"><header className="world-match-top"><a href="/ludo-world" className="world-back">← World</a><div className="world-match-brand"><span>{config.icon}</span><div><small>LUDO WORLD</small><strong>{config.title}</strong></div></div><div className="world-live"><i/> LIVE</div></header><section className="world-match-intro"><div><small>{config.eyebrow}</small><h1>{config.title}</h1><p>{config.subtitle}</p></div><div className="world-match-players"><div className="world-player"><div className="world-player-avatar"><EquippedAvatar style={{width:"100%",height:"100%"}}/></div><div><small>YOU</small><strong>{user.username}</strong><span>LEVEL {user.level}</span></div></div><div className="world-vs">VS</div><div className="world-player opponent"><div className="world-opponent-icon">{config.icon}</div><div><small>OPPONENT</small><strong>{mode==="boss"?"WORLD BOSS":mode==="teams"?"WORLD TEAM":"WORLD AI"}</strong><span>{mode==="boss"?"ELITE":"ACTIVE"}</span></div></div></div></section><section className={"world-turn "+(turn==="human"?"human":"bot")}><div><small>{turn==="human"?"YOUR TURN":"OPPONENT TURN"}</small><strong>{config.seriesToWin?"Series "+series.human+" : "+series.bot+" · Round "+round:(pendingDice!==null&&turn==="human"?"Rolled "+pendingDice+". Choose a token.":message)}</strong></div>{config.turnSeconds&&<b className="world-timer">{turn==="human"?seconds+"s":"AI"}</b>}</section><section className="world-board-frame"><WorldBoard theme={theme} tokens={tokens} legal={legal} onToken={moveHuman}/></section><section className="world-action"><div className="world-action-copy"><small>{rolling?"DICE":pendingDice!==null?"MOVE":"YOUR DICE"}</small><strong>{rolling?"Rolling…":lastDice!==null?"Rolled "+lastDice:"Tap to roll"}</strong></div><Dice value={lastDice||1} rolling={rolling} disabled={turn!=="human"||pendingDice!==null||over} onRoll={rollHuman}/><div className="world-action-hint">{pendingDice!==null?"Tap a glowing token to move":turn==="human"?"Roll once, then choose your token":"Waiting for the opponent…"}</div></section><section className="world-rules"><div className="world-rules-icon">{config.icon}</div><div><small>{config.title} rules</small><p>{config.rules.join(" · ")}</p></div></section>{over&&<div className="world-overlay"><section className="world-result"><div className="world-result-icon">{turn==="human"?"🏆":"🎲"}</div><small>MATCH COMPLETE</small><h2>{turn==="human"?"You Win!":"World AI Wins"}</h2><p>{message}</p><div className="world-result-actions"><button className="world-primary" onClick={function(){setOver(false);setSeries({human:0,bot:0});setRound(1);restartRound();}}>Play Again</button><a className="world-secondary" href="/ludo-world">World Hub</a></div></section></div>}</main>;
}
