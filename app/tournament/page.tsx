"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import AppFrame from "../_components/AppFrame";

type Wallet={coins:number;gems:number;spins:number;mystery:number};
const defaultWallet:Wallet={coins:25680,gems:320,spins:0,mystery:0};
const TOURNAMENT_KEY="ludo-grand-tournament-end";
function readWallet():Wallet{try{return {...defaultWallet,...JSON.parse(localStorage.getItem("ludo-wallet")||"{}")}}catch{return defaultWallet}}
function getEndAt(){try{const saved=Number(localStorage.getItem(TOURNAMENT_KEY));if(saved>0)return saved}catch{}const value=Date.now()+((2*24+14)*60+30)*60*1000;localStorage.setItem(TOURNAMENT_KEY,String(value));return value}
function formatRemaining(ms:number){if(ms<=0)return "Ended";const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return `${d}d ${h}h ${m}m`}
export default function TournamentPage(){const [wallet,setWallet]=useState(defaultWallet),[joined,setJoined]=useState(false),[notice,setNotice]=useState(""),[endAt,setEndAt]=useState(0),[remaining,setRemaining]=useState(0);useEffect(()=>{const end=getEndAt();setEndAt(end);setRemaining(end-Date.now());setWallet(readWallet());const refresh=()=>setWallet(readWallet());window.addEventListener("ludo-wallet-updated",refresh);const t=window.setInterval(()=>setRemaining(end-Date.now()),1000);return()=>{window.removeEventListener("ludo-wallet-updated",refresh);window.clearInterval(t)}},[]);const join=()=>{if(joined)return;if(remaining<=0){setNotice("This tournament has ended.");return}if(wallet.coins<1000){setNotice("You need 1,000 coins to enter this tournament.");return}const w={...wallet,coins:wallet.coins-1000};localStorage.setItem("ludo-wallet",JSON.stringify(w));window.dispatchEvent(new Event("ludo-wallet-updated"));setWallet(w);setJoined(true);setNotice("You joined the Grand Tournament!")};return <AppFrame back="/home"><main style={page}><header style={header}><button onClick={()=>history.back()} style={back}>←</button><b>Tournament</b><button style={info}>ⓘ</button></header><section style={hero}><div style={heroArt}><span>🎲</span><span>🏆</span><span>🪙</span><span>💎</span></div><div style={eyebrow}>GRAND TOURNAMENT</div><div style={cup}>🏆</div><div style={endBadge}>Ends in: {endAt?formatRemaining(remaining):"2d 14h 30m"}</div></section><section style={card}><div style={prizeRow}><div><small>Prize Pool</small><strong>🪙 100,000</strong></div><div><small>&nbsp;</small><strong>💎 2,000</strong></div></div><div style={infoGrid}><div><small>Entry Fee</small><strong>🪙 1,000</strong></div><div><small>Players</small><strong>256 / 512</strong></div><div><small>Type</small><strong>Solo</strong></div></div><div style={rules}><div style={rulesTitle}>Rules</div><div>• 4 Players</div><div>• Standard Rules</div><div>• Top 3 Win Prizes</div><div style={rulesCup}>🏆</div></div><button onClick={join} disabled={joined||remaining<=0} style={{...joinBtn,opacity:(joined||remaining<=0)?.65:1}}>{joined?"Joined Tournament":remaining<=0?"Tournament Ended":"Join Tournament"}</button></section><button style={myBtn}>My Tournaments <span>›</span></button>{notice&&<div style={noticeStyle}>{notice}</div>}</main></AppFrame>}
const page:CSSProperties={maxWidth:650,margin:"0 auto",paddingBottom:45};
const header:CSSProperties={height:54,display:"grid",gridTemplateColumns:"44px 1fr 44px",alignItems:"center",fontSize:18};
const back:CSSProperties={border:0,background:"transparent",color:"#fff",fontSize:27,cursor:"pointer",textAlign:"left"};
const info:CSSProperties={border:0,background:"transparent",color:"#dbe7f6",fontSize:20,textAlign:"right"};
const hero:CSSProperties={position:"relative",overflow:"hidden",borderRadius:9,padding:"12px 12px 14px",textAlign:"center",background:"radial-gradient(circle at 50% 20%,#5422bd,#29105f 55%,#101b45)",border:"1px solid #6132cf",boxShadow:"inset 0 0 45px #7c3aed55"};
const heroArt:CSSProperties={height:45,display:"flex",justifyContent:"center",gap:28,alignItems:"center",fontSize:27,filter:"drop-shadow(0 2px 3px #000)"};
const eyebrow:CSSProperties={fontSize:18,fontWeight:950,color:"#ffe45b",marginTop:2};
const cup:CSSProperties={fontSize:46,lineHeight:1.05};
const endBadge:CSSProperties={display:"inline-block",padding:"7px 18px",borderRadius:7,background:"#e3312d",color:"#fff",fontSize:12,fontWeight:950};
const card:CSSProperties={marginTop:7,padding:"0 12px 12px",borderRadius:9,background:"#06172c",border:"1px solid #17365b"};
const prizeRow:CSSProperties={display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"13px 0",borderBottom:"1px solid #17304e"};
const infoGrid:CSSProperties={display:"grid",gridTemplateColumns:"1.1fr 1fr .8fr",gap:8,padding:"12px 0",borderBottom:"1px solid #17304e"};
const small:CSSProperties={display:"block",fontSize:10,color:"#8fa4bf",marginBottom:4};
const rules:CSSProperties={position:"relative",padding:"12px 0",display:"grid",gap:5,color:"#c8d5e6",fontSize:12};
const rulesTitle:CSSProperties={fontWeight:950,color:"#fff"};
const rulesCup:CSSProperties={position:"absolute",right:18,top:18,fontSize:45};
const joinBtn:CSSProperties={width:"100%",border:0,borderRadius:6,padding:12,background:"linear-gradient(180deg,#42d521,#209c10)",color:"#fff",fontWeight:950,fontSize:15};
const myBtn:CSSProperties={width:"100%",marginTop:7,border:0,borderRadius:6,padding:12,background:"#0a2446",color:"#fff",fontWeight:900,display:"flex",justifyContent:"space-between"};
const noticeStyle:CSSProperties={marginTop:9,padding:10,borderRadius:8,background:"#082d18",color:"#82e99d",fontSize:12,textAlign:"center"};
