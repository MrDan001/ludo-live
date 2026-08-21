import Link from "next/link";
import AppFrame from "../_components/AppFrame";

const events = [
  { icon: "🏆", title: "Weekend Ludo Clash", detail: "Play online games and compete for leaderboard rewards.", reward: "5,000 🪙", status: "LIVE" },
  { icon: "🔥", title: "Hot Streak Challenge", detail: "Keep your winning streak going and unlock bonus rewards.", reward: "2,500 🪙", status: "ACTIVE" },
  { icon: "🎯", title: "Mission Rush", detail: "Complete missions during the event period for extra prizes.", reward: "1,000 🪙 + 💎", status: "ACTIVE" },
];

export default function EventsPage() {
  return <AppFrame back="/home"><div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 40 }}>
    <header><div style={{ color: "#60a5fa", fontWeight: 950, letterSpacing: 2, fontSize: 12 }}>LIVE ACTIVITIES</div><h1 style={{ fontSize: 38, margin: "5px 0" }}>📅 Events</h1><p style={{ color: "#94a3b8", marginTop: 0 }}>Join active events and compete for extra Ludo rewards.</p></header>
    <div style={{ display: "grid", gap: 12, marginTop: 20 }}>{events.map(e=><article key={e.title} style={{ padding: 16, borderRadius: 18, background: "linear-gradient(145deg,#071b3c,#050d20)", border: "1px solid rgba(96,165,250,.18)" }}><div style={{ display: "flex", gap: 14, alignItems: "center" }}><div style={{ width: 54, height: 54, borderRadius: 15, display: "grid", placeItems: "center", fontSize: 31, background: "#0d2752" }}>{e.icon}</div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><h2 style={{ margin: 0, fontSize: 19 }}>{e.title}</h2><span style={{ color: "#4ade80", fontSize: 10, fontWeight: 950 }}>{e.status}</span></div><p style={{ margin: "5px 0 10px", color: "#94a3b8", fontSize: 13 }}>{e.detail}</p><strong style={{ color: "#facc15", fontSize: 13 }}>Reward: {e.reward}</strong></div></div></article>)}</div>
    <Link href="/lobby" style={{ display: "inline-block", marginTop: 16, padding: "11px 16px", borderRadius: 11, background: "#2563eb", color: "#fff", textDecoration: "none", fontWeight: 900 }}>PLAY NOW</Link>
  </div></AppFrame>;
}
