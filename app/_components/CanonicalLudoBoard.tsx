"use client";
import React,{useEffect,useRef,useState} from "react";
import LudoBoard,{BOARD_NAMES,BOARD_PALETTES,type BoardThemeId,type DemoToken} from "./LudoBoard";
import YardSkinOverlay from "./YardSkinOverlay";
import {getTokenCell} from "../../lib/canonicalLudoBoard";
export type {BoardThemeId,DemoToken};
type Props={theme?:BoardThemeId;demoTokens?:DemoToken[];onTokenClick?:(color:DemoToken["color"],id:number)=>void;legalTokenKeys?:string[]};
const YARD_CENTERS:Record<DemoToken["color"],Array<[string,string]>>={green:[["calc(13.61% + 2.85px)","calc(13.61% + 2.85px)"],["calc(26.39% - 2.85px)","calc(13.61% + 2.85px)"],["calc(13.61% + 2.85px)","calc(26.39% - 2.85px)"],["calc(26.39% - 2.85px)","calc(26.39% - 2.85px)"]],yellow:[["calc(73.61% + 2.85px)","calc(13.61% + 2.85px)"],["calc(86.39% - 2.85px)","calc(13.61% + 2.85px)"],["calc(73.61% + 2.85px)","calc(26.39% - 2.85px)"],["calc(86.39% - 2.85px)","calc(26.39% - 2.85px)"]],red:[["calc(13.61% + 2.85px)","calc(73.61% + 2.85px)"],["calc(26.39% - 2.85px)","calc(73.61% + 2.85px)"],["calc(13.61% + 2.85px)","calc(86.39% + 2.85px)"],["calc(26.39% - 2.85px)","calc(86.39% + 2.85px)"]],blue:[["calc(73.61% + 2.85px)","calc(73.61% + 2.85px)"],["calc(86.39% - 2.85px)","calc(73.61% + 2.85px)"],["calc(73.61% - 2.85px)","calc(86.39% - 2.85px)"],["calc(86.39% - 2.85px)","calc(86.39% - 2.85px)"]]};
const FINISH_SLOTS:Array<[string,string]>=[["44%","44%"],["48%","44%"],["44%","48%"],["48%","48%"],["52%","44%"],["56%","44%"],["52%","48%"],["56%","48%"],["44%","52%"],["48%","52%"],["44%","56%"],["48%","56%"],["52%","52%"],["56%","52%"],["52%","56%"],["56%","56%"]];
const FINISH_ORDER:{[key:string]:number}={red:0,yellow:1,green:2,blue:3};
const MOVE_STEP_MS=220;
const tokenKey=(t:DemoToken)=>`${t.color}:${t.id}`;
const stateFor=(position:number):DemoToken["state"]=>position===0?"yard":position===57?"finished":position>51?"home":"track";
const tokenWithPosition=(token:DemoToken,position:number):DemoToken=>({...token,position,state:stateFor(position)});
const emitMoveAudio=()=>{try{if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("ludo-audio",{detail:"move"}))}catch{}};

export default function CanonicalLudoBoard({theme="classic",demoTokens=[],onTokenClick,legalTokenKeys=[]}:Props){
 const p=BOARD_PALETTES[theme]||BOARD_PALETTES.classic;
 const [visualTokens,setVisualTokens]=useState<DemoToken[]>(demoTokens);
 const visualRef=useRef<DemoToken[]>(demoTokens);
 const previousAuthoritativeRef=useRef<Map<string,number>|null>(null);
 const animationRef=useRef<{key:string;timer:number}|null>(null);
 useEffect(()=>{visualRef.current=visualTokens},[visualTokens]);
 useEffect(()=>{
  const incoming=new Map<string,{token:DemoToken;position:number}>();
  demoTokens.forEach(t=>incoming.set(tokenKey(t),{token:t,position:Number(t.position)||0}));
  const previous=previousAuthoritativeRef.current;
  previousAuthoritativeRef.current=new Map(Array.from(incoming.entries()).map(([key,value])=>[key,value.position]));
  if(!previous){setVisualTokens(demoTokens);visualRef.current=demoTokens;return}

  const movement=Array.from(incoming.entries()).find(([key,value])=>{
   const old=previous.get(key);
   return old!==undefined&&value.position>old;
  });
  const active=animationRef.current;
  if(movement){
   const [moveKey,moveValue]=movement;
   if(active&&active.key!==moveKey){window.clearInterval(active.timer);animationRef.current=null;}
   if(!animationRef.current||animationRef.current.key===moveKey){
    const current=visualRef.current.find(t=>tokenKey(t)===moveKey);
    const start=Math.max(0,Number(current?.position ?? previous.get(moveKey) ?? 0));
    const target=moveValue.position;

    // A capture is represented authoritatively as a jump from the track to FINISH.
    // It is not a normal movement through every remaining board square: the killer
    // must land directly in the centre. A normal home-to-centre move is 56 -> 57
    // and therefore still uses the regular one-box stepping below.
    const isCaptureJump=target===57&&start<56;
    if(isCaptureJump){
      if(animationRef.current)window.clearInterval(animationRef.current.timer);
      animationRef.current=null;
      visualRef.current=visualRef.current.map(t=>tokenKey(t)===moveKey?tokenWithPosition(moveValue.token,57):t);
      setVisualTokens(prev=>prev.map(t=>tokenKey(t)===moveKey?tokenWithPosition(moveValue.token,57):t));
      emitMoveAudio();
    }else if(start>=target){
      setVisualTokens(prev=>prev.map(t=>tokenKey(t)===moveKey?tokenWithPosition(moveValue.token,target):t));
      visualRef.current=visualRef.current.map(t=>tokenKey(t)===moveKey?tokenWithPosition(moveValue.token,target):t);
    }else{
      if(animationRef.current)window.clearInterval(animationRef.current.timer);
      const timer=window.setInterval(()=>{
       const next=Number(visualRef.current.find(t=>tokenKey(t)===moveKey)?.position??start)+1;
       if(next>=target){
        window.clearInterval(timer);animationRef.current=null;
        const finalToken=tokenWithPosition(moveValue.token,target);
        visualRef.current=visualRef.current.map(t=>tokenKey(t)===moveKey?finalToken:t);
        setVisualTokens(prev=>prev.map(t=>tokenKey(t)===moveKey?finalToken:t));
        emitMoveAudio();
        return;
       }
       const currentToken=visualRef.current.find(t=>tokenKey(t)===moveKey);
       if(!currentToken){window.clearInterval(timer);animationRef.current=null;return;}
       const stepped=tokenWithPosition(moveValue.token,next);
       visualRef.current=visualRef.current.map(t=>tokenKey(t)===moveKey?stepped:t);
       setVisualTokens(prev=>prev.map(t=>tokenKey(t)===moveKey?stepped:t));
       emitMoveAudio();
      },MOVE_STEP_MS);
      animationRef.current={key:moveKey,timer};
    }
   }
  }

  setVisualTokens(prev=>{
   const activeKey=animationRef.current?.key||"";
   const next=prev.map(existing=>{
    const nextIncoming=incoming.get(tokenKey(existing));
    if(!nextIncoming)return existing;
    const key=tokenKey(existing);
    if(key===activeKey&&nextIncoming.position>=existing.position)return existing;
    const old=previous.get(key);
    if(old===undefined||nextIncoming.position<=old)return tokenWithPosition(nextIncoming.token,nextIncoming.position);
    return existing;
   });
   visualRef.current=next;
   return next;
  });
 },[demoTokens]);
 useEffect(()=>()=>{if(animationRef.current)window.clearInterval(animationRef.current.timer)},[]);

 const visualByKey=new Map(visualTokens.map(t=>[tokenKey(t),t]));
 const normalized=demoTokens.map(t=>visualByKey.get(tokenKey(t))||t);
 const visual=normalized.map(t=>{const position=Number(t.position)||0;return {...t,position,state:stateFor(position)};});
 const moving=visual.filter(t=>t.state!=="yard"&&t.state!=="finished").map(t=>{const cell=getTokenCell(t.color,t.position);return cell?{...t,row:cell[0],col:cell[1]}:null}).filter(Boolean) as Array<DemoToken&{row:number;col:number}>;
 const finished=visual.filter(t=>t.state==="finished");
 const legalSet=new Set(legalTokenKeys);const yardTokens=visual.filter(t=>t.state==="yard");
 const sharedGroups=new Map<string,Array<DemoToken&{row:number;col:number}>>();moving.forEach(t=>{const key=`${t.row}-${t.col}`;const group=sharedGroups.get(key)||[];group.push(t);sharedGroups.set(key,group);});
 const stackedMoving=Array.from(sharedGroups.values()).flatMap(group=>group.map((t,index)=>({t,index,count:group.length})));
 const yardTokenStyle=(color:DemoToken["color"],left:string,top:string,legal:boolean):React.CSSProperties=>({position:"absolute",left,top,transform:"translate(-50%,-50%)",width:"10.9%",aspectRatio:1,borderRadius:"50%",border:`3px solid ${p.accent}`,background:p[color],boxShadow:legal?`inset 0 2px 3px rgba(255,255,255,.55),0 0 0 2px ${p.accent},0 0 18px ${p.accent}`:"inset 0 2px 3px rgba(255,255,255,.55),0 2px 5px rgba(0,0,0,.25)",animation:legal?"legalYardTokenBreath 1.45s ease-in-out infinite":undefined,zIndex:30,padding:0,cursor:"pointer",fontSize:0,color:"transparent"});
 const stackOffset=(index:number,count:number):[number,number]=>{if(count<=1)return[0,0];if(count===2)return[index===0?-1:1,index===0?-1:1];if(count===3){const slots:[number,number][]=[[-1,-1],[1,-1],[0,1]];return slots[index]??[0,0];}if(count===4){const slots:[number,number][]=[[-1,-1],[1,-1],[-1,1],[1,1]];return slots[index]??[0,0];}const cols=Math.ceil(Math.sqrt(count));const rows=Math.ceil(count/cols);const col=index%cols;const row=Math.floor(index/cols);return[(col-(cols-1)/2)*1.4,(row-(rows-1)/2)*1.4];};
 return <div className="canonical-ludo-frame" style={{position:"relative",width:"100%",aspectRatio:"1",touchAction:"none",overscrollBehavior:"contain",userSelect:"none",WebkitUserSelect:"none"} as React.CSSProperties} aria-label={`${BOARD_NAMES[theme]} canonical Ludo board`}>
  <style>{`.canonical-ludo-frame{isolation:isolate}.canonical-ludo-frame .shared-ludo-board{box-shadow:none!important;border:0!important;outline:none!important;filter:none!important;position:relative;z-index:1}@keyframes legalYardTokenBreath{0%,100%{transform:translate(-50%,-50%) scale(.94);filter:saturate(1)}50%{transform:translate(-50%,-50%) scale(1.08);filter:saturate(1.12)}}@keyframes canonicalTokenBreath{0%,100%{transform:translate(-50%,-50%) scale(.94);filter:saturate(1)}50%{transform:translate(-50%,-50%) scale(1.07);filter:saturate(1.12)}}`}</style>
  <LudoBoard theme={theme} demoTokens={[]} onTokenClick={onTokenClick} style={{width:"100%",height:"100%"}}/><YardSkinOverlay />
  {yardTokens.map(t=>{const [left,top]=YARD_CENTERS[t.color][t.id]||YARD_CENTERS[t.color][0];const legal=legalSet.has(`${t.color}-${t.id}`);return <button key={`yard-${t.color}-${t.id}`} type="button" onClick={()=>onTokenClick?.(t.color,t.id)} aria-label={`${legal?"Legal move for ":""}${t.color} token`} style={yardTokenStyle(t.color,left,top,legal)}/>;})}
  {stackedMoving.map(({t,index,count})=>{const key=`${t.color}-${t.id}`,legal=legalSet.has(key);const [dx,dy]=stackOffset(index,count);return <button key={`moving-${key}`} type="button" onClick={()=>onTokenClick?.(t.color,t.id)} aria-label={`${legal?"Legal move for ":""}${t.color} token ${count>1?`(${index+1} of ${count} on square)`:""}`} style={{position:"absolute",left:`calc(${(t.col+.5)*100/15}% + ${dx*0.9}%)`,top:`calc(${(t.row+.5)*100/15}% + ${dy*0.9}%)`,transform:"translate(-50%,-50%)",width:count>1?"5.8%":"6.8%",aspectRatio:1,borderRadius:"50%",border:`2px solid ${p.accent}`,background:p[t.color],boxShadow:legal?`inset 0 2px 3px rgba(255,255,255,.55),0 0 0 2px ${p.accent},0 0 18px ${p.accent}`:"inset 0 2px 3px rgba(255,255,255,.55),0 2px 5px rgba(0,0,0,.3)",animation:legal?"canonicalTokenBreath 1.45s ease-in-out infinite":undefined,zIndex:30+index,padding:0,cursor:legal?"pointer":"default",fontSize:0,color:"transparent"}}/>;})}
  {finished.map(t=>{const group=FINISH_ORDER[t.color]??0;const slotIndex=group*4+t.id;const slot=FINISH_SLOTS[slotIndex]||FINISH_SLOTS[0];return <div key={`finished-${t.color}-${t.id}`} aria-label={`${t.color} finished token`} style={{position:"absolute",left:slot[0],top:slot[1],transform:"translate(-50%,-50%)",width:"4%",aspectRatio:1,borderRadius:"50%",background:p[t.color],border:`2px solid ${p.accent}`,zIndex:35}}/>;})}
 </div>;
}