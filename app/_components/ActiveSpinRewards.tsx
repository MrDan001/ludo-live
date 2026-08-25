"use client";
import { useEffect, useState } from "react";

export default function ActiveSpinRewards(){
  const [notice,setNotice]=useState(0);
  useEffect(()=>{
    let alive=true;let timer:number|undefined;
    const heartbeat=async()=>{
      if(document.visibilityState!=="visible")return;
      try{
        const r=await fetch("/api/spin/activity",{method:"POST",cache:"no-store"});
        if(!r.ok)return;const d=await r.json();
        if(!alive||!d?.granted)return;
        const granted=Number(d.granted)||0;setNotice(granted);window.dispatchEvent(new Event("ludo-spin-updated"));
        if(typeof Notification!=="undefined"&&Notification.permission==="granted")new Notification("🎉 Free Spin Earned!",{body:`You've earned ${granted} free ${granted===1?"spin":"spins"}. Use them on the Spin Wheel.`});
        window.setTimeout(()=>alive&&setNotice(0),6500);
      }catch{}
    };
    heartbeat();timer=window.setInterval(heartbeat,60000);
    const visible=()=>{if(document.visibilityState==="visible")heartbeat()};document.addEventListener("visibilitychange",visible);
    return()=>{alive=false;if(timer)clearInterval(timer);document.removeEventListener("visibilitychange",visible)};
  },[]);
  if(!notice)return null;
  return <div style={toast}><span style={{fontSize:28}}>🎉</span><div><b>Free Spin Earned!</b><small>+{notice} {notice===1?"spin":"spins"} added to your Spin Wheel.</small></div><button onClick={()=>setNotice(0)} aria-label="Close notification">×</button></div>;
}
const toast:React.CSSProperties={position:"fixed",top:18,right:14,zIndex:1000,display:"flex",alignItems:"center",gap:10,maxWidth:"calc(100vw - 28px)",padding:"12px 14px",borderRadius:14,background:"linear-gradient(135deg,#126b3b,#159447)",border:"1px solid #54e78d",boxShadow:"0 12px 35px rgba(0,0,0,.45)",color:"#fff"};
