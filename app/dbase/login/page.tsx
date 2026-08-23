"use client";
import {FormEvent,useEffect,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";

export default function DbaseLogin(){
  const router=useRouter();
  const params=useSearchParams();
  const next=params.get("next")||"/dbase";
  const [identifier,setIdentifier]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    fetch("/api/admin",{cache:"no-store"}).then(r=>{if(r.ok)router.replace(next)}).catch(()=>{});
  },[next,router]);

  async function submit(e:FormEvent){
    e.preventDefault();setError("");setBusy(true);
    try{
      const login=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"login",identifier,password})});
      const data=await login.json();
      if(!login.ok)throw new Error(data.error||"Unable to sign in.");
      const admin=await fetch("/api/admin",{cache:"no-store"});
      if(!admin.ok){await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});throw new Error("This account does not have DBASE administrator access.");}
      router.replace(next);
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:"Unable to sign in.");}
    finally{setBusy(false)}
  }

  return <main style={styles.page}>
    <div style={styles.card}>
      <div style={styles.icon}>🔐</div>
      <div style={styles.eyebrow}>LUDO LIVE • ADMINISTRATION</div>
      <h1 style={styles.title}>DBASE</h1>
      <p style={styles.subtitle}>Secure administrator gateway</p>
      <form onSubmit={submit} style={styles.form}>
        <label style={styles.label}>Admin email or username<input style={styles.input} autoComplete="username" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="admin@example.com" required/></label>
        <label style={styles.label}>Password<input style={styles.input} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/></label>
        {error&&<div style={styles.error}>{error}</div>}
        <button disabled={busy} style={{...styles.button,opacity:busy?.7:1}}>{busy?"VERIFYING…":"ENTER DBASE →"}</button>
      </form>
      <p style={styles.note}>Your normal player login does not grant DBASE access. Only accounts listed in the server's admin allow-list can enter.</p>
    </div>
  </main>
}

const styles:any={page:{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"radial-gradient(circle at top,#17366b 0,#050b1d 48%,#020611 100%)",color:"#eaf2ff",fontFamily:"system-ui"},card:{width:"min(460px,100%)",padding:"34px 28px",borderRadius:24,border:"1px solid #315589",background:"rgba(7,18,40,.96)",boxShadow:"0 24px 80px rgba(0,0,0,.45)"},icon:{width:64,height:64,borderRadius:18,display:"grid",placeItems:"center",fontSize:30,background:"#102b57",border:"1px solid #3a72b8",marginBottom:18},eyebrow:{fontSize:11,letterSpacing:2.2,fontWeight:900,color:"#6daeff"},title:{fontSize:42,margin:"7px 0 0",letterSpacing:1,fontWeight:950},subtitle:{color:"#91a8c9",margin:"5px 0 25px"},form:{display:"grid",gap:16},label:{display:"grid",gap:7,fontSize:13,fontWeight:800,color:"#c8d8f2"},input:{width:"100%",padding:"13px 14px",borderRadius:12,border:"1px solid #2b4772",background:"#050f24",color:"white",outline:"none",fontSize:16},button:{border:0,borderRadius:12,padding:"14px 16px",background:"linear-gradient(90deg,#1769ee,#713cf0)",color:"white",fontWeight:950,fontSize:15,cursor:"pointer"},error:{padding:"11px 13px",borderRadius:10,border:"1px solid #9d4050",background:"#35121b",color:"#ffb2bd",fontSize:13,fontWeight:700},note:{margin:"20px 0 0",color:"#7188aa",fontSize:12,lineHeight:1.5}};