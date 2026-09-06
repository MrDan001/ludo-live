"use client";

import {useEffect,useRef} from "react";
import {usePathname} from "next/navigation";
import {expireSessionOnScreenOff} from "../../lib/account";

const PUBLIC=new Set(["/","/login","/register","/signup","/auth","/privacy","/terms"]);

export default function ScreenOffSession(){
 const pathname=usePathname();
 const timer=useRef<number|null>(null);
 const expiring=useRef(false);

 useEffect(()=>{
  if(typeof window==="undefined"||PUBLIC.has(pathname)||pathname.startsWith("/login/")||pathname.startsWith("/register/")||pathname.startsWith("/signup/")||pathname.startsWith("/auth/"))return;

  const cancel=()=>{if(timer.current!==null){window.clearTimeout(timer.current);timer.current=null}};
  const onHidden=()=>{
   cancel();
   if(document.visibilityState!=="hidden"||expiring.current)return;
   timer.current=window.setTimeout(async()=>{
    timer.current=null;
    if(document.visibilityState!=="hidden"||expiring.current)return;
    expiring.current=true;
    try{await expireSessionOnScreenOff()}finally{expiring.current=false}
   },1500);
  };
  const onVisible=()=>cancel();

  document.addEventListener("visibilitychange",onHidden);
  window.addEventListener("pagehide",onHidden);
  window.addEventListener("pageshow",onVisible);
  return()=>{
   cancel();
   document.removeEventListener("visibilitychange",onHidden);
   window.removeEventListener("pagehide",onHidden);
   window.removeEventListener("pageshow",onVisible);
  };
 },[pathname]);

 return null;
}
