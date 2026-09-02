"use client";

import {useEffect,useRef} from "react";
import {usePathname,useRouter} from "next/navigation";

const PUBLIC=new Set(["/","/login","/signup","/auth","/privacy","/terms"]);

export default function AuthGuard(){
  const pathname=usePathname();
  const router=useRouter();
  const checking=useRef(false);

  useEffect(()=>{
    if(PUBLIC.has(pathname)||pathname.startsWith("/login/")||pathname.startsWith("/signup/")||pathname.startsWith("/auth/"))return;
    let cancelled=false;
    const check=async()=>{
      if(checking.current)return;
      checking.current=true;
      try{
        const r=await fetch("/api/auth",{cache:"no-store",credentials:"same-origin"});
        const d=await r.json().catch(()=>({}));
        if(!cancelled&&(!r.ok||!d?.user)){
          try{sessionStorage.removeItem("ludo-live:last-session-v1")}catch{}
          await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"}),credentials:"same-origin"}).catch(()=>{});
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      }catch{
        // Do not log a player out because of a transient network failure.
      }finally{checking.current=false}
    };
    check();
    const timer=window.setInterval(check,60_000);
    const onVisibility=()=>{if(document.visibilityState==="visible")check()};
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility)};
  },[pathname,router]);

  return null;
}
