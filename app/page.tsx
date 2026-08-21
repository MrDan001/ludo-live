"use client";

import { useState } from "react";

export default function LandingPage(){
 const [busy,setBusy]=useState(false);
 const go=(url:string)=>{setBusy(true);window.location.href=url};
 const guest=()=>{localStorage.setItem("ludo-guest-mode","1");localStorage.removeItem("ludo-account-created");go("/home")};
 return <main style={shell}>
  <div style={glow}/>
  <section style={hero}>
   <div style={brand}><span style={brandIcon}>🎲</span><span>LUDO LIVE</span></div>
   <div style={badge}>🌍 PLAY • COMPETE • CONNECT</div>
   <h1 style={title}>Your next Ludo game<br/><span style={accent}>starts here.</span></h1>
   <p style={subtitle}>Create your player account to keep your profile, XP, level, coins, gems, friends and achievements safe and connected.</p>
   <div style={card}>
    <h2 style={cardTitle}>Welcome to Ludo Live</h2>
    <p style={cardText}>Sign in or create an account to unlock the full social experience.</p>
    <button disabled={busy} onClick={()=>go("/account?next=/home")} style={primary}>CREATE ACCOUNT</button>
    <button disabled={busy} onClick={()=>go("/account?next=/home")} style={secondary}>SIGN IN</button>
    <div style={divider}><span>OR CONTINUE WITH</span></div>
    <div style={socialRow}>
      <button disabled={busy} onClick={()=>go("/account?next=/home&social=google")} style={google}><span style={googleG}>G</span> Google</button>
      <button disabled={busy} onClick={()=>go("/account?next=/home&social=facebook")} style={facebook}><span style={fb}>f</span> Facebook</button>
    </div>
    <button disabled={busy} onClick={guest} style={guestBtn}>CONTINUE AS GUEST</button>
    <p style={guestNote}>Guest mode lets you play, but social features require an account.</p>
   </div>
   <div style={features}><span>🪙 Save your balance</span><span>⭐ Keep your XP & level</span><span>👥 Add friends</span><span>🏆 Keep achievements</span></div>
  </section>
 </main>
}

const shell={minHeight:"100vh",position:"relative" as const,overflow:"hidden",display:"flex",justifyContent:"center",padding:"28px 16px 40px",boxSizing:"border-box" as const,background:"radial-gradient(circle at 50% -10%,#153f8c 0,#071a3e 35%,#020817 78%)",color:"#fff",fontFamily:"Arial,Helvetica,sans-serif"};
const glow={position:"absolute" as const,width:420,height:420,borderRadius:"50%",top:-260,left:"50%",transform:"translateX(-50%)",background:"rgba(37,99,235,.28)",filter:"blur(70px)"};
const hero={position:"relative" as const,zIndex:1,width:"min(100%,620px)",textAlign:"center" as const};
const brand={display:"inline-flex",alignItems:"center",gap:9,fontWeight:1000,letterSpacing:2,fontSize:19,color:"#dbeafe"};
const brandIcon={fontSize:28};
const badge={display:"inline-block",marginTop:28,padding:"8px 13px",borderRadius:999,background:"rgba(37,99,235,.16)",border:"1px solid rgba(96,165,250,.3)",color:"#93c5fd",fontSize:11,fontWeight:900,letterSpacing:1};
const title={fontSize:"clamp(40px,10vw,64px)",lineHeight:1.03,margin:"22px 0 14px",fontWeight:1000,letterSpacing:-2};
const accent={color:"#38bdf8"};
const subtitle={maxWidth:520,margin:"0 auto 24px",fontSize:16,lineHeight:1.55,color:"#9fb2cf"};
const card={margin:"0 auto",padding:"22px",borderRadius:25,background:"linear-gradient(145deg,rgba(8,31,73,.97),rgba(4,17,39,.98))",border:"1px solid rgba(92,142,223,.28)",boxShadow:"0 24px 80px rgba(0,0,0,.35)"};
const cardTitle={margin:"0 0 5px",fontSize:24};
const cardText={margin:"0 0 17px",color:"#8fa7c9",fontSize:13};
const primary={width:"100%",border:0,borderRadius:13,padding:15,background:"linear-gradient(90deg,#1769e8,#2b8cff)",color:"#fff",fontWeight:1000,fontSize:15};
const secondary={width:"100%",border:"1px solid #2d5a93",borderRadius:13,padding:14,marginTop:10,background:"#081a38",color:"#dbeafe",fontWeight:950,fontSize:14};
const divider={display:"flex",alignItems:"center",justifyContent:"center",gap:10,margin:"18px 0 12px",color:"#6682a9",fontSize:10,fontWeight:900};
const socialRow={display:"grid",gridTemplateColumns:"1fr 1fr",gap:10};
const google={border:"1px solid #3b557b",borderRadius:12,padding:13,background:"#fff",color:"#1f2937",fontWeight:900,fontSize:14};
const facebook={border:0,borderRadius:12,padding:13,background:"#1877f2",color:"#fff",fontWeight:900,fontSize:14};
const googleG={display:"inline-grid",placeItems:"center",width:20,height:20,marginRight:5,fontWeight:1000,color:"#4285f4",background:"#fff"};
const fb={display:"inline-block",fontSize:20,lineHeight:0,marginRight:4,fontWeight:1000};
const guestBtn={width:"100%",marginTop:12,border:"1px solid rgba(96,165,250,.28)",borderRadius:12,padding:13,background:"transparent",color:"#9cc7ff",fontWeight:950,fontSize:13};
const guestNote={margin:"10px 0 0",fontSize:11,color:"#607a9f"};
const features={display:"flex",justifyContent:"center",flexWrap:"wrap" as const,gap:"9px 15px",marginTop:20,color:"#7189ad",fontSize:11,fontWeight:800};
