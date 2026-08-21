"use client";
import { FormEvent, useEffect, useState } from "react";
import { createAccount, getAccount, hashPassword, syncLegacyProfile } from "../../lib/account";

export default function AccountPage(){
 const [next,setNext]=useState("/dashboard");
 const [mode,setMode]=useState<"create"|"login">("create");
 const [username,setUsername]=useState("");const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false);const[error,setError]=useState("");
 useEffect(()=>{if(typeof window!=="undefined"){const n=new URLSearchParams(window.location.search).get("next");if(n&&n.startsWith("/"))setNext(n)}if(getAccount())setMode("login")},[]);
 const submit=async(e:FormEvent)=>{e.preventDefault();setError("");setBusy(true);try{
   if(mode==="create"){
    if(password!==confirm)throw new Error("Passwords do not match.");
    await createAccount(username,email,password);localStorage.setItem("ludo-account-created","1");window.location.href=next;
   }else{
    const account=getAccount();if(!account)throw new Error("Create an account first.");
    const identifier=(username||email).trim().toLowerCase();
    const matches=account.username.toLowerCase()===identifier||account.email===identifier;
    if(!matches||account.passwordHash!==await hashPassword(password))throw new Error("Incorrect account details.");
    syncLegacyProfile(account);window.location.href=next;
   }
  }catch(err:any){setError(err?.message||"Something went wrong.");}finally{setBusy(false)}};
 return <main style={shell}><div style={card}>
  <div style={{fontSize:42}}>🎲</div><h1 style={{margin:"8px 0 4px",fontSize:30}}>Create your Ludo account</h1><p style={{color:"#9fb2cf",lineHeight:1.5,marginTop:0}}>Your profile, level, XP, coins, gems and social identity stay attached to your account on this device.</p>
  <div style={tabs}><button onClick={()=>{setMode("create");setError("")}} style={mode==="create"?activeTab:tab}>CREATE ACCOUNT</button><button onClick={()=>{setMode("login");setError("")}} style={mode==="login"?activeTab:tab}>SIGN IN</button></div>
  <form onSubmit={submit} style={{display:"grid",gap:13}}>
   <label style={label}>{mode==="create"?"Username":"Username or email"}<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required placeholder={mode==="create"?"Choose a player name":"Your username or email"} style={input}/></label>
   {mode==="create"&&<label style={label}>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" style={input}/></label>}
   <label style={label}>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete={mode==="create"?"new-password":"current-password"} required minLength={6} placeholder="At least 6 characters" style={input}/></label>
   {mode==="create"&&<label style={label}>Confirm password<input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" autoComplete="new-password" required minLength={6} placeholder="Repeat your password" style={input}/></label>}
   {mode==="create"&&<div style={starting}><b>New player starter balance</b><span>🪙 1,000 coins &nbsp; • &nbsp; 💎 10 gems</span></div>}
   {error&&<div style={errorBox}>{error}</div>}
   <button disabled={busy} type="submit" style={primary}>{busy?"PLEASE WAIT…":mode==="create"?"CREATE ACCOUNT":"SIGN IN"}</button>
  </form>
  <button onClick={()=>window.location.href="/dashboard"} style={skip}>← Back to Dashboard</button>
 </div></main>
}
const shell={minHeight:"100vh",display:"grid",placeItems:"center",padding:20,boxSizing:"border-box" as const,background:"linear-gradient(180deg,#031536,#010611)",color:"#fff"};
const card={width:"min(100%,470px)",boxSizing:"border-box" as const,padding:24,borderRadius:24,background:"linear-gradient(145deg,#081f49,#06152f)",border:"1px solid rgba(88,137,218,.3)",boxShadow:"0 25px 70px rgba(0,0,0,.35)"};
const tabs={display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,padding:5,margin:"18px 0",borderRadius:13,background:"#06142d"};
const tab={border:0,background:"transparent",color:"#9db0cd",padding:11,borderRadius:9,fontWeight:900};
const activeTab={...tab,background:"#1769e8",color:"#fff"};
const label={display:"grid",gap:7,color:"#d7e4f7",fontWeight:800,fontSize:13};
const input={width:"100%",boxSizing:"border-box" as const,padding:13,borderRadius:11,border:"1px solid #31517f",background:"#06142d",color:"#fff",fontSize:16,outline:"none"};
const starting={display:"grid",gap:4,padding:12,borderRadius:12,background:"rgba(21,101,216,.12)",border:"1px solid rgba(79,139,236,.22)",color:"#dbeafe",fontSize:12};
const errorBox={padding:11,borderRadius:10,background:"rgba(153,27,27,.35)",border:"1px solid rgba(248,113,113,.35)",color:"#fecaca",fontSize:13};
const primary={border:0,padding:14,borderRadius:12,background:"linear-gradient(90deg,#1769e8,#2185ff)",color:"#fff",fontWeight:950,fontSize:15};
const skip={border:0,background:"transparent",color:"#8fb8f0",padding:14,fontWeight:800,width:"100%"};
