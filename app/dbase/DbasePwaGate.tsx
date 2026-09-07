"use client";
import { useEffect,useState } from "react";
import { usePathname } from "next/navigation";
function standalone(){if(typeof window==="undefined")return false;return matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone)}
export default function DbasePwaGate({children}:{children:React.ReactNode}){const pathname=usePathname();const[ready,setReady]=useState(false);useEffect(()=>{if(pathname==="/dbase/install"){setReady(true);return}if(standalone()){setReady(true);return}window.location.replace("/dbase/install")},[pathname]);if(!ready)return <div className="dbase-loading"><div className="loader-ring"/><strong>Opening DBASE…</strong></div>;return <>{children}</>}