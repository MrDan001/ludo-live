"use client";

import {useEffect,useRef} from "react";
import {usePathname,useRouter} from "next/navigation";

const PUBLIC=new Set(["/","/login","/register","/signup","/auth","/privacy","/terms"]);

export default function AuthGuard(){
  const pathname=usePathname();
  const router=useRouter();
  const checking=useRef(false);

  useEffect(()=>{
    if(PUBLIC.has(pathname)||pathname.startsWith("/login/")||pathname.startsWith("/register/")||pathname.startsWith("/signup/")||pathname.startsWith("/auth/"))return;
    let cancelled=false;
    const check=async()=>{
      if(checking.current)return;
      checking.current=true;
      try{
        const r=await fetch("/api/auth",{cache:"no-store",credentials:"same-origin"});
        const d=await r.json().catch(()=>({}));
        if(!cancelled&&(!r.ok||!d?.user))router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }catch{
        // A temporary network failure never expires a player session.
      }finally{checking.current=false}
    };
    check();
    const timer=window.setInterval(check,60_000);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[pathname,router]);

  return null;
}
