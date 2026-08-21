import Link from "next/link";

const actions = [
  { href: "/lobby", icon: "🌐", title: "PLAY ONLINE", subtitle: "Play with players around the world", tone: "green" },
  { href: "/lobby", icon: "👥", title: "PLAY WITH FRIENDS", subtitle: "Invite friends & play together", tone: "teal" },
  { href: "/lobby", icon: "🏠", title: "PRIVATE ROOM", subtitle: "Create or join a private room", tone: "blue" },
  { href: "/mode", icon: "🏆", title: "TOURNAMENT", subtitle: "Join tournaments & win big", tone: "purple" },
];
const shortcuts = [
  { href: "/rewards", icon: "🎁", label: "Daily Reward" },
  { href: "/shop", icon: "🛒", label: "Shop" },
  { href: "/social?tab=events", icon: "📅", label: "Events" },
  { href: "/spin", icon: "🎯", label: "Spin Wheel" },
];
const toneStyles: Record<string, { background: string; border: string; glow: string }> = {
  green: { background: "linear-gradient(135deg,#159447 0%,#42c936 100%)", border: "#75ed62", glow: "rgba(54,211,72,.28)" },
  teal: { background: "linear-gradient(135deg,#087b61 0%,#19b66b 100%)", border: "#43d38b", glow: "rgba(25,182,107,.25)" },
  blue: { background: "linear-gradient(135deg,#173fba 0%,#1769e8 100%)", border: "#4d8cff", glow: "rgba(37,99,235,.28)" },
  purple: { background: "linear-gradient(135deg,#6b1998 0%,#9b38cf 100%)", border: "#c46ae8", glow: "rgba(155,56,207,.28)" },
};
export default function HomePage() {
  return <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#031536 0%,#020b1d 48%,#010611 100%)", color: "#fff", paddingBottom: 92 }}>
    <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", padding: "12px 14px 0", boxSizing: "border-box" }}>
      <header style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "8px 2px 14px" }}>
        <Link href="/profile" style={{ color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}><div style={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", background: "radial-gradient(circle at 35% 30%,#ffd86b,#e49c18 55%,#7d4800 100%)", border: "3px solid #ffd447", boxShadow: "0 0 0 3px rgba(255,210,55,.12),0 5px 18px rgba(0,0,0,.35)", fontSize: 27 }}>🧑🏽</div><div><div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.1 }}>PlayerOne</div><div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}><span style={{ background: "#f6c51b", color: "#382300", borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 950 }}>25</span><span style={{ width: 70, height: 7, borderRadius: 99, background: "#162b50", overflow: "hidden", display: "inline-block" }}><span style={{ display: "block", width: "58%", height: "100%", background: "linear-gradient(90deg,#f4a51c,#ffe066)" }} /></span><span style={{ color: "#f5d75d", fontSize: 10, fontWeight: 800 }}>4,250 XP</span></div></div></Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={currency}>🪙 <b>25,680</b></div><div style={currency}>💎 <b>1,250</b></div><Link href="/shop" aria-label="Shop" style={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", textDecoration: "none", background: "#37b92e", border: "2px solid #83ec64", color: "#fff", fontWeight: 950, fontSize: 20 }}>+</Link></div>
      </header>
      <section style={{ marginTop: 4, display: "grid", gap: 12 }}>{actions.map(a=>{const t=toneStyles[a.tone];return <Link key={a.title} href={a.href} style={{ minHeight: 84, borderRadius: 19, display: "grid", gridTemplateColumns: "58px 1fr", alignItems: "center", gap: 12, padding: "10px 18px", boxSizing: "border-box", color: "#fff", textDecoration: "none", background: t.background, border: `1px solid ${t.border}`, boxShadow: `0 10px 28px ${t.glow}, inset 0 1px rgba(255,255,255,.16)` }}><span style={{ width: 52, height: 52, display: "grid", placeItems: "center", fontSize: 38 }}>{a.icon}</span><span><strong style={{ display: "block", fontSize: 20, lineHeight: 1.05 }}>{a.title}</strong><small style={{ display: "block", marginTop: 6, fontSize: 12.5, fontWeight: 650 }}>{a.subtitle}</small></span><span style={{ gridColumn: "2", marginTop: -42, justifySelf: "end", fontSize: 26, opacity: .8 }}>›</span></Link>})}</section>
      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderRadius: 17, overflow: "hidden", background: "rgba(4,18,43,.96)", border: "1px solid rgba(73,113,180,.22)" }}>{shortcuts.map(i=><Link key={i.label} href={i.href} style={{ minHeight: 88, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, color: "#eaf2ff", textDecoration: "none" }}><span style={{ fontSize: 27 }}>{i.icon}</span><span style={{ fontSize: 10.5, fontWeight: 800, textAlign: "center" }}>{i.label}</span></Link>)}</section>
      <section style={{ marginTop: 14, padding: 14, borderRadius: 17, background: "linear-gradient(135deg,rgba(10,37,83,.9),rgba(6,20,48,.96))", border: "1px solid rgba(79,124,204,.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><div style={{ color: "#ffd94f", fontWeight: 950, fontSize: 13 }}>🔥 DAILY STREAK</div><div style={{ marginTop: 4, color: "#b7c7df", fontSize: 12 }}>Keep playing to unlock bigger rewards.</div></div><Link href="/rewards" style={{ textDecoration: "none", color: "#111827", background: "#f6c51b", padding: "10px 14px", borderRadius: 11, fontWeight: 950, fontSize: 12 }}>CLAIM</Link></section>
      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}><Link href="/social?tab=friends" style={feature}>👥 <b>Friends</b><small>Online players & invites</small></Link><Link href="/social?tab=leaderboard" style={feature}>🏅 <b>Leaderboard</b><small>See global rankings</small></Link><Link href="/social?tab=missions" style={feature}>🎯 <b>Missions</b><small>Complete tasks for coins</small></Link><Link href="/social?tab=history" style={feature}>📜 <b>Match History</b><small>Wins, defeats & rewards</small></Link></section>
    </div>
    <nav style={{ position: "fixed", zIndex: 20, left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", height: 72, display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: "rgba(2,12,31,.98)", borderTop: "1px solid rgba(72,111,175,.3)" }}><Link href="/home" style={bottomStyle(true)}>⌂<small>Home</small></Link><Link href="/social?tab=friends" style={bottomStyle(false)}>👥<small>Friends</small></Link><Link href="/social?tab=chat" style={bottomStyle(false)}>💬<small>Chat</small></Link><Link href="/profile" style={bottomStyle(false)}>👤<small>Profile</small></Link></nav>
  </main>;
}
const currency={display:"flex",alignItems:"center",gap:4,padding:"8px 9px",borderRadius:12,background:"rgba(5,23,55,.9)",border:"1px solid rgba(79,124,204,.24)",fontSize:13};
const feature={textDecoration:"none",color:"#fff",padding:15,borderRadius:15,background:"rgba(7,25,56,.92)",border:"1px solid rgba(79,124,204,.2)",display:"flex",flexDirection:"column" as const,gap:4,fontSize:20};
function bottomStyle(active:boolean){return {color:active?"#fff":"#8fa4c4",background:active?"rgba(26,86,181,.42)":"transparent",textDecoration:"none",display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",gap:3,fontWeight:850,fontSize:23};}