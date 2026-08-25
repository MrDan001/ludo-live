"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import AppFrame from "../_components/AppFrame";

type EventItem = { id:string; icon:string; title:string; description:string; reward:string; rewardCoins:number; rewardGems:number; startsAt:string; endsAt:string; state:string; joined:boolean; progress:number; missionTarget:number; missionKind:string; modes:string[]; boards:string[]; color:string };

function countdown(ms:number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function labels(items:string[]) {
  const map:any = { bot:"Bot vs Human", "2p":"2 Player", "4p":"4 Player", tournament:"Tournament", classic:"Classic", midnight:"Midnight Live", royal:"Royal", jungle:"Jungle", "fire-ice":"Fire & Ice" };
  return items.map(x => map[x] || x).join(" • ");
}

export default function EventsPage() {
  const [tab,setTab] = useState<"Live Events"|"Upcoming">("Live Events");
  const [events,setEvents] = useState<EventItem[]>([]);
  const [now,setNow] = useState(Date.now());
  const [busy,setBusy] = useState<string>("");
  const [msg,setMsg] = useState("");

  const load = async () => {
    try {
      const r = await fetch("/api/events", { cache:"no-store", credentials:"include" });
      const x = await r.json();
      if (!r.ok) throw Error(x.error || "Events unavailable.");
      setEvents(x.events || []);
      setNow(Date.now());
    } catch (e) { setMsg(e instanceof Error ? e.message : "Events unavailable."); }
  };
  useEffect(() => { void load(); const timer = setInterval(() => setNow(Date.now()),1000); const refresh = setInterval(() => void load(),15000); return () => { clearInterval(timer); clearInterval(refresh); }; }, []);

  const live = useMemo(() => events.filter(e => e.state === "live"), [events]);
  const upcoming = useMemo(() => events.filter(e => e.state === "upcoming"), [events]);
  const shown = tab === "Live Events" ? live : upcoming;

  const join = async (e:EventItem) => {
    setBusy(e.id); setMsg("");
    try {
      const r = await fetch("/api/events", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({action:"join",eventId:e.id}) });
      const x = await r.json();
      if (!r.ok) throw Error(x.error || "Could not join event.");
      setMsg(`Joined ${e.title}. Your progress is now tracked from supported gameplay.`);
      await load();
    } catch (err) { setMsg(err instanceof Error ? err.message : "Could not join event."); }
    finally { setBusy(""); }
  };

  return <AppFrame hideBack><main style={page}>
    <header style={header}><button onClick={() => history.back()} style={back}>←</button><div style={headerTitle}>Events</div><div/></header>
    <div style={tabs}>{["Live Events","Upcoming"].map(t => <button key={t} onClick={() => setTab(t as any)} style={{...tabStyle,...(tab===t?tabActive:{})}}>{t}<span style={count}>{t === "Live Events" ? live.length : upcoming.length}</span></button>)}</div>
    {msg && <div style={notice}>{msg}</div>}
    <section style={list}>
      {shown.map(e => {
        const end = new Date(e.endsAt).getTime(), start = new Date(e.startsAt).getTime();
        const remaining = tab === "Live Events" ? end - now : start - now;
        const pct = e.missionTarget ? Math.min(100, Math.round((e.progress / e.missionTarget) * 100)) : 0;
        return <article key={e.id} style={{...card,background:e.color === "purple" ? "linear-gradient(110deg,#341079,#54168b)" : "linear-gradient(110deg,#07336e,#084e99)"}}>
          <div style={icon}>{e.icon}</div>
          <div style={body}><strong style={title}>{e.title}</strong><div style={desc}>{e.description}</div>
            <div style={meta}>🎮 {labels(e.modes)}</div><div style={meta}>🎨 {labels(e.boards)}</div>
            <div style={ends}>{tab === "Live Events" ? `Ends in: ${countdown(remaining)}` : `Starts in: ${countdown(remaining)}`}</div>
            {e.joined && <><div style={progressHead}><span>Progress</span><b>{e.progress}/{e.missionTarget}</b></div><div style={progressTrack}><span style={{...progressFill,width:`${pct}%`}}/></div></>}
          </div>
          <div style={right}><div style={reward}>{e.reward}</div>{tab === "Live Events" && <button disabled={!!busy || e.joined} onClick={() => void join(e)} style={joinBtn}>{busy===e.id ? "JOINING…" : e.joined ? (e.progress>=e.missionTarget ? "COMPLETED" : "JOINED") : "JOIN EVENT"}</button>}</div>
        </article>;
      })}
      {!shown.length && <div style={empty}><div style={{fontSize:40}}>{tab === "Live Events" ? "🏁" : "📆"}</div><h2>{tab === "Live Events" ? "No live events" : "No upcoming events"}</h2><p>{tab === "Live Events" ? "New live challenges will appear here automatically when their admin-set start time arrives." : "Admin-scheduled events will appear here with a live countdown."}</p></div>}
    </section>
    <button style={calendar} onClick={() => setTab(tab === "Live Events" ? "Upcoming" : "Live Events")}>▦ {tab === "Live Events" ? "View Upcoming Events" : "View Live Events"}</button>
  </main></AppFrame>;
}

const page:CSSProperties={maxWidth:650,margin:"0 auto",paddingBottom:45};
const header:CSSProperties={height:52,display:"grid",gridTemplateColumns:"44px 1fr 44px",alignItems:"center",marginBottom:8};
const back:CSSProperties={border:0,background:"transparent",color:"#fff",fontSize:32,cursor:"pointer",textAlign:"left",lineHeight:1};
const headerTitle:CSSProperties={textAlign:"center",fontSize:20,fontWeight:950};
const tabs:CSSProperties={display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,padding:4,borderRadius:9,background:"#06152b",border:"1px solid #12345c"};
const tabStyle:CSSProperties={border:0,borderRadius:7,padding:"11px",background:"#0a1d38",color:"#dbe8f8",fontSize:13,fontWeight:900};
const tabActive:CSSProperties={background:"linear-gradient(180deg,#277cf0,#1762d1)",color:"#fff"};
const count:CSSProperties={marginLeft:7,display:"inline-block",minWidth:20,padding:"2px 6px",borderRadius:999,background:"rgba(255,255,255,.14)"};
const list:CSSProperties={display:"grid",gap:8,marginTop:12};
const card:CSSProperties={display:"flex",alignItems:"center",gap:12,minHeight:125,padding:"14px 12px",borderRadius:12,border:"1px solid rgba(120,70,190,.55)",boxShadow:"inset 0 0 18px rgba(255,255,255,.05)"};
const icon:CSSProperties={width:58,textAlign:"center",fontSize:40,filter:"drop-shadow(0 2px 3px #000)"};
const body:CSSProperties={flex:1,minWidth:0};
const title:CSSProperties={fontSize:18};
const desc:CSSProperties={marginTop:6,color:"#d8def0",fontSize:13};
const meta:CSSProperties={marginTop:5,color:"#b8c9e4",fontSize:10,fontWeight:700};
const ends:CSSProperties={marginTop:8,color:"#fff",fontSize:12,fontWeight:800};
const reward:CSSProperties={fontSize:22,fontWeight:950,whiteSpace:"nowrap",textAlign:"right"};
const right:CSSProperties={display:"grid",justifyItems:"end",gap:8};
const joinBtn:CSSProperties={border:"1px solid #70b1ff",borderRadius:9,padding:"8px 10px",background:"#1762d1",color:"#fff",fontSize:11,fontWeight:950,cursor:"pointer"};
const progressHead:CSSProperties={display:"flex",justifyContent:"space-between",marginTop:8,fontSize:10,color:"#dbe8f8"};
const progressTrack:CSSProperties={height:6,background:"rgba(0,0,0,.35)",borderRadius:99,overflow:"hidden",marginTop:4};
const progressFill:CSSProperties={display:"block",height:"100%",borderRadius:99,background:"linear-gradient(90deg,#60a5fa,#22c55e)",transition:"width .25s ease"};
const notice:CSSProperties={marginTop:10,padding:10,borderRadius:9,background:"#0c2b4d",border:"1px solid #1d5d8f",color:"#cce8ff",fontSize:12,fontWeight:700};
const calendar:CSSProperties={width:"100%",marginTop:16,padding:14,border:0,borderRadius:7,background:"linear-gradient(180deg,#247bea,#145ec8)",color:"#fff",fontSize:16,fontWeight:950};
const empty:CSSProperties={marginTop:12,padding:45,background:"#07172d",borderRadius:12,border:"1px solid #17385f",textAlign:"center",color:"#9db0c8"};
