"use client";

import { useEffect, useState } from "react";
import WinnerCelebration from "./WinnerCelebration";
import ForfeitControl from "./ForfeitControl";

export default function AppFrame({ children, back = "/home", backLabel = "← Back", hideBack = false }: { children: React.ReactNode; back?: string; backLabel?: string; hideBack?: boolean }) {
  const [spinNotice, setSpinNotice] = useState(0);
  const goBack = () => {
    if (window.history.length > 1) window.history.back(); else window.location.href = back;
  };

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const heartbeat = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/spin/activity", { method: "POST", cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!alive || !d?.granted) return;
        setSpinNotice(Number(d.granted));
        window.dispatchEvent(new Event("ludo-spin-updated"));
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("🎉 Free Spin Earned!", { body: `You've earned ${d.granted} free ${d.granted === 1 ? "spin" : "spins"}. Use them on the Spin Wheel.` });
        }
        window.setTimeout(() => alive && setSpinNotice(0), 6500);
      } catch {}
    };
    heartbeat();
    timer = window.setInterval(heartbeat, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") heartbeat(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; if (timer) clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #10265d 0%, #020817 48%, #01030a 100%)", color: "#fff", padding: "18px 12px 32px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {!hideBack && <button type="button" onClick={goBack} style={{ color: "#93c5fd", background: "transparent", border: 0, padding: 0, fontSize: 16, fontWeight: 700, display: "inline-block", marginBottom: 16, cursor: "pointer" }}>{backLabel}</button>}
        {children}
      </div>
      {spinNotice > 0 && <div style={spinToast}><span style={{fontSize:28}}>🎉</span><div><b>Free Spin Earned!</b><small>+{spinNotice} {spinNotice === 1 ? "spin" : "spins"} added to your Spin Wheel.</small></div><button onClick={()=>setSpinNotice(0)} aria-label="Close notification">×</button></div>}
      <WinnerCelebration />
      <ForfeitControl />
    </main>
  );
}

const spinToast: React.CSSProperties = { position:"fixed", top:18, right:14, zIndex:100, display:"flex", alignItems:"center", gap:10, maxWidth:"calc(100vw - 28px)", padding:"12px 14px", borderRadius:14, background:"linear-gradient(135deg,#126b3b,#159447)", border:"1px solid #54e78d", boxShadow:"0 12px 35px rgba(0,0,0,.45)", color:"#fff" };
