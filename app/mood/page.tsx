"use client";

import {useEffect,useState} from "react";

export default function MoodPage(){
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const timer=window.setTimeout(()=>{setReady(true);window.location.replace("/game")},650);
    return()=>window.clearTimeout(timer);
  },[]);

  return (
    <main style={{minHeight:"100dvh",background:"radial-gradient(circle at 50% 42%,#123b73 0%,#06162f 42%,#020b1d 100%)",color:"#fff",display:"grid",placeItems:"center",overflow:"hidden",fontFamily:"Arial,Helvetica,sans-serif"}}>
      <section style={{textAlign:"center",width:"100%",maxWidth:420,padding:"24px",boxSizing:"border-box"}} aria-live="polite">
        <div style={{width:62,height:62,margin:"0 auto 20px",borderRadius:"50%",border:"3px solid rgba(98,180,255,.25)",borderTopColor:"#62b4ff",animation:"spin 0.85s linear infinite",boxShadow:"0 0 28px rgba(98,180,255,.25)"}} />
        <div style={{fontSize:11,fontWeight:950,letterSpacing:4,color:"#62b4ff",marginBottom:9}}>LUDO LIVE</div>
        <h1 style={{margin:0,fontSize:"clamp(24px,7vw,34px)",fontWeight:950}}>{ready?"Starting game…":"Loading game…"}</h1>
        <p style={{margin:"9px 0 0",color:"#9fb9df",fontSize:14}}>Getting your board ready</p>
      </section>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}
