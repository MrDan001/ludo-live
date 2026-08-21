"use client";
import { useEffect, useState } from "react";
import AppFrame from "../_components/AppFrame";

type Wallet={coins:number;gems:number;spins:number;mystery:number};
const defaultWallet:Wallet={coins:25680,gems:320,spins:0,mystery:0};
export default function TournamentPage(){const [wallet,setWallet]=useState<Wallet>(defaultWallet);const [joined,setJoined]=useState(false);const [notice,setNotice]=useState("");useEffect(()=>{try{setWallet({...defaultWallet,...JSON.parse(localStorage.getItem("ludo-wallet")||"{}")})}catch{}},[]);const join=()=>{if(wallet.coins<1000){setNotice("You need 1,000 coins to enter this tournament.");return}const w={...wallet,coins:wallet.coins-1000};localStorage.setItem("ludo-wallet",JSON.stringify(w));window.dispatchEvent(new Event("ludo-wallet-updated"));setWallet(w);setJoined(true);setNotice("You joined the Grand Tournament!")};return <AppFrame back="/home"><main style={page}><header style={top}><span>‹</span><b>Tournament</b><span>ⓘ</span></header><section style={hero}><div style={eyebrow}>GRAND TOURNAMENT</div><div style={{fontSize:48}}>🏆</div><div style={heroText}>Ends in: 2d 14h 30m</div></section><section style={card}><div style={stats}><div><small>Prize Pool</small><b>🪙 100,000</b></div><div><small>💎</small><b>2,000</b></div></div><div style={stats}><div><small>Entry Fee</small><b>🪙 1,000</b></div><div><small>Players</small><b>256 / 512</b></div><div><small>Type</small><b>Solo</b></div></div><div style={rules}><b>Rules</b><span>• 4 Players</span><span>• Standard Rules</span><span>• Top 3 Win Prizes</span><strong>🏆</strong></div><button onClick={join} disabled={joined} style={joinBtn}>{joined?"JOINED":"Join Tournament"}</button></section><button style={myBtn}>My Tournaments <span>›</span></button>{notice&&<div style={noticeStyle}>{notice}</div>}</main></AppFrame>}
const page={maxWidth:650,margin:"0 auto",paddingBottom:45};
const top={display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 4px 12px",fontSize:18};
const hero={borderRadius:10,padding:"20px 15px",textAlign:"center" as const,background:"linear-gradient(145deg,#35109d,#1d174e 65%,#0c1837)",border:"1px solid #4b2ab0",boxShadow:"inset 0 0 40px #7c3aed33"};
const eyebrow={fontSize:18,fontWeight:950,color:"#ffe45b"};
const heroText={display:"inline-block",padding:"7px 18px",borderRadius:7,background:"#e3342f",fontSize:12,fontWeight:900};
const card={marginTop:8,padding:13,borderRadius:10,background:"#06172c",border:"1px solid #17365b"};
const stats={display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,padding:"12px 0",borderBottom:"1px solid #17304e"};
const rules={display:"grid",gap:6,padding:"12px 0",fontSize:12,color:"#c2d0e3",position:"relative" as const};
const joinBtn={width:"100%",border:0,borderRadius:6,padding:"12px",background:"linear-gradient(180deg,#3bc91f,#1b970c)",color:"#fff",fontWeight:950,fontSize:15};
const myBtn={width:"100%",marginTop:8,border:0,borderRadius:6,padding:"12px",background:"#0a2446",color:"#fff",fontWeight:900,display:"flex",justifyContent:"space-between"};
const noticeStyle={marginTop:10,padding:10,borderRadius:8,background:"#082d18",color:"#82e99d",fontSize:12,textAlign:"center" as const};
