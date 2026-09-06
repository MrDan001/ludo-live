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
  const onVisibilityChange=()=>{
   if(document.visibilityState==="visible"){cancel();return}
   cancel();
   if(expiring.current)return;
   // Require the screen to remain hidden for 60 seconds before expiring.
   // Normal in-app route changes do not trigger this event, so browser back remains safe.
   timer.current=window.setTimeout(async()=>{
    timer.current=null;
    if(document.visibilityState!=="hidden"||expiring.current)return;
    expiring.current=true;
    try{await expireSessionOnScreenOff()}finally{expiring.current=false}
   },60000);
  };

  document.addEventListener("visibilitychange",onVisibilityChange);
  return()=>{cancel();document.removeEventListener("visibilitychange",onVisibilityChange)};
 },[pathname]);

 return null;
}
