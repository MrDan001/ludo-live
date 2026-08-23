"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import AppFrame from "../_components/AppFrame";

type Settings={sound:boolean;music:boolean;voice:boolean;vibration:boolean};
const defaults:Settings={sound:true,music:true,voice:true,vibration:true};
const labels=[['sound','🔊','Sound','Game sounds and UI effects'],['music','🎵','Music','Background music'],['voice','🎙️','Voice Chat','In-game voice controls'],['vibration','📳','Vibration','Haptic feedback for actions']] as const;

export default function SettingsPage(){
 const router=useRouter(); const[settings,setSettings]=useState<Settings>(defaults); const[message,setMessage]=useState("");
 useEffect(()=>{try{const saved=localStorage.getItem("ludo-settings");if(saved)setSettings({...defaults,...JSON.parse(saved)});}catch{}},[]);
 const toggle=(key:keyof Settings)=>{setSettings(s=>{const n={...s,[key]:!s[key]};localStorage.setItem("ludo-settings",JSON.stringify(n));window.dispatchEvent(new CustomEvent("ludo-settings-updated",{detail:n}));return n})};
 const logout=async()=>{try{const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});if(!r.ok)throw Error();localStorage.removeItem("ludo-settings");router.replace("/login")}catch{setMessage("Unable to log out right now.")}};
 return <AppFrame back="/home"><div style={{maxWidth:700,margin:"0 auto",paddingBottom:40}}><h1 style={{fontSize:36}}>Settings</h1><p style={{color:"#94a3b8"}}>Customize your Ludo Live experience. Changes apply across your profile and games.</p><section style={panel}>{labels.map(([key,icon,title,desc])=><button key={key} onClick={()=>toggle(key)} style={row}><span><span style={{fontSize:25,marginRight:10}}>{icon}</span><span><b>{title}</b><small>{desc}</small></span></span><span style={{width:56,height:31,borderRadius:20,padding:3,background:settings[key]?"#37b51e":"#334155",display:"flex",justifyContent:settings[key]?"flex-end":"flex-start"}}><span style={{width:25,height:25,borderRadius:"50%",background:"#fff"}}/></span></button>)}</section><section style={{...panel,marginTop:12}}><Link href="/how-to" style={linkRow}>❓ <b>Game Rules & Help</b><span>›</span></Link><Link href="/privacy" style={linkRow}>🛡️ <b>Privacy Policy</b><span>›</span></Link><Link href="/terms" style={linkRow}>📄 <b>Terms of Service</b><span>›</span></Link><Link href="/support" style={linkRow}>💬 <b>Help & Support</b><span>›</span></Link></section><button onClick={logout} style={logoutStyle}>Logout</button>{message&&<p style={{color:"#93c5fd"}}>{message}</p>}</div></AppFrame>}
const panel={background:"linear-gradient(180deg,#061b42,#04132f)",border:"1px solid rgba(78,125,211,.25)",borderRadius:18,overflow:"hidden",marginTop:20};
const row={width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",border:0,borderBottom:"1px solid rgba(78,125,211,.13)",background:"transparent",color:"#fff",cursor:"pointer",textAlign:"left" as const,fontSize:16};
const linkRow={width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px",borderBottom:"1px solid rgba(78,125,211,.13)",background:"transparent",color:"#fff",textDecoration:"none",cursor:"pointer",fontSize:15};
const logoutStyle={width:"100%",marginTop:18,padding:17,borderRadius:14,border:0,background:"linear-gradient(180deg,#ef2b22,#b91c1c)",color:"#fff",fontWeight:950,fontSize:18};