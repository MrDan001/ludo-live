"use client";
import { useState } from "react";
import Link from "next/link";

export async function hasRegisteredAccount(){
 try{const r=await fetch("/api/auth",{cache:"no-store"});const d=await r.json();return !!d?.user&&!d.user.isGuest}catch{return false}
}

export function AccountGateModal({open,onClose}:{open:boolean;onClose:()=>void}){
 if(!open)return null;
 return <div style={{position:"fixed",inset:0,zIndex:2000,display:"grid",placeItems:"center",padding:20,background:"rgba(0,0,0,.72)"}}>
  <div style={{width:"min(420px,100%)",padding:24,borderRadius:20,background:"linear-gradient(145deg,#0b2552,#050d20)",border:"1px solid rgba(96,165,250,.35)",boxShadow:"0 20px 60px rgba(0,0,0,.5)",textAlign:"center"}}>
   <div style={{fontSize:44}}>🔐</div><h2 style={{margin:"8px 0"}}>Account required</h2>
   <p style={{color:"#a9bad3",lineHeight:1.6}}>Guest players can explore Ludo Live, but you need a registered account to create or join rooms and connect with friends.</p>
   <div style={{display:"grid",gap:9,marginTop:18}}><Link href="/account?mode=register" style={{padding:13,borderRadius:11,background:"#22c55e",color:"#04130a",fontWeight:950,textDecoration:"none"}}>CREATE ACCOUNT</Link><Link href="/account?mode=login" style={{padding:13,borderRadius:11,background:"#2563eb",color:"#fff",fontWeight:950,textDecoration:"none"}}>SIGN IN</Link><button onClick={onClose} style={{padding:11,borderRadius:11,border:"1px solid #334155",background:"transparent",color:"#cbd5e1",fontWeight:800}}>CANCEL</button></div>
  </div>
 </div>
}

export function useAccountGate(){
 const [open,setOpen]=useState(false);
 const check=async(onAllowed:()=>void|Promise<void>)=>{if(await hasRegisteredAccount())await onAllowed();else setOpen(true)};
 return {open,setOpen,check};
}
