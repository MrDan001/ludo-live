"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readProgress, xpRequiredForLevel } from "../../lib/playerProgress";

type Wallet = { coins: number; gems: number };
type Action = { icon: string; title: string; sub: string; href: string; bg: string };

const actions: Action[] = [
  { icon: "🌐", title: "PLAY ONLINE", sub: "See real players waiting in open rooms", href: "/lobby", bg: "linear-gradient(135deg,#159447,#31c936)" },
  { icon: "👥", title: "PLAY WITH FRIENDS", sub: "Invite friends and play together", href: "/lobby", bg: "linear-gradient(135deg,#087b61,#16b875)" },
  { icon: "🎯", title: "MISSIONS", sub: "Complete objectives before rewards unlock", href: "/missions", bg: "linear-gradient(135deg,#173fba,#1769e8)" },
  { icon: "🏆", title: "TOURNAMENT", sub: "Join tournaments and compete for rewards", href: "/mode", bg: "linear-gradient(135deg,#6b1998,#a126c8)" },
];
const shortcuts = [["🎁", "Daily Reward", "/daily-reward"], ["🛒", "Shop", "/shop"], ["📅", "Events", "/events"], ["🎡", "Spin Wheel", "/spin"]] as const;
const nav = [["⌂", "Home", "/home"], ["👥", "Friends", "/friends"], ["💬", "Chat", "/chat"], ["👤", "Profile", "/profile"]] as const;

export default function HomePage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState("PlayerOne");
  const [progress, setProgress] = useState(() => readProgress());

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.width = "100%";
    // Keep the document root scrollable so mobile browsers can perform their
    // native pull-to-refresh gesture. The Home UI itself remains fixed/non-scrollable.
    document.body.style.overflow = "";
    document.body.style.overscrollBehaviorY = "auto";
    document.documentElement.style.margin = "0";
    document.documentElement.style.width = "100%";
    document.documentElement.style.overflow = "";
    document.documentElement.style.overscrollBehaviorY = "auto";
    let alive = true;
    const refresh = async () => {
      try {
        const r = await fetch("/api/wallet", { cache: "no-store" });
        const d = await r.json();
        if (alive && r.ok && d?.wallet) setWallet({ coins: Number(d.wallet.coins) || 0, gems: Number(d.wallet.gems) || 0 });
      } catch {}
    };
    const refreshProgress = () => setProgress(readProgress());
    refresh();
    setName(localStorage.getItem("ludo-player-name") || "PlayerOne");
    refreshProgress();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("ludo-wallet-updated", refresh);
    window.addEventListener("ludo-progression-updated", refreshProgress);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("ludo-wallet-updated", refresh);
      window.removeEventListener("ludo-progression-updated", refreshProgress);
      document.body.style.overflow = "";
      document.body.style.overscrollBehaviorY = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.overscrollBehaviorY = "";
    };
  }, []);

  const required = Math.max(1, xpRequiredForLevel(progress.level));
  const xpPercent = Math.min(100, Math.max(0, (progress.xp / required) * 100));
  const levelPercent = Math.min(100, Math.max(0, (progress.level / Math.max(progress.level + 1, 1)) * 100));

  // Use the small viewport height for the fixed app shell. Unlike 100dvh, 100svh
  // does not change when a mobile browser's address bar expands/collapses, preventing
  // the first-render jump where the bottom navigation is briefly misplaced.
  const page: React.CSSProperties = { position: "fixed", inset: 0, width: "100%", height: "100svh", overflow: "hidden", background: "linear-gradient(180deg,#031536 0%,#020b1d 52%,#010611 100%)", color: "#fff", fontFamily: "Arial,Helvetica,sans-serif" };
  const shell: React.CSSProperties = { width: "100%", maxWidth: 720, height: "calc(100svh - 68px - env(safe-area-inset-bottom, 0px))", margin: "0 auto", padding: "6px 12px", boxSizing: "border-box", display: "grid", gridTemplateRows: "auto minmax(0,1fr) 88px 76px", gap: 7, overflow: "hidden" };
  const header: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 6, minHeight: 70 };
  const profile: React.CSSProperties = { display: "flex", alignItems: "center", gap: 9, minWidth: 0, color: "#fff", textDecoration: "none" };
  const avatarWrap: React.CSSProperties = { position: "relative", flex: "0 0 clamp(52px,13vw,64px)", width: "clamp(52px,13vw,64px)", height: "clamp(52px,13vw,64px)", borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(145deg,#ffe45c,#ffb300)", border: "3px solid #ffd43b" };
  const avatar: React.CSSProperties = { width: "82%", height: "82%", borderRadius: "50%", display: "grid", placeItems: "center", background: "#c58a54", border: "2px solid #8b5a32", fontSize: "clamp(27px,7vw,36px)", overflow: "hidden" };
  const badge: React.CSSProperties = { position: "absolute", bottom: -7, left: "50%", transform: "translateX(-50%)", minWidth: 30, height: 21, borderRadius: 7, display: "grid", placeItems: "center", background: "#ffd21a", color: "#111", border: "2px solid #f5b900", fontSize: 12, fontWeight: 950 };
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 5, marginTop: 5, minWidth: 0 };
  const track: React.CSSProperties = { display: "block", flex: 1, minWidth: 30, height: 7, borderRadius: 99, background: "#102746", overflow: "hidden" };
  const walletRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 5 };
  const walletItem: React.CSSProperties = { padding: "7px 8px", borderRadius: 11, background: "#051737", border: "1px solid #173766", fontSize: "clamp(10px,2.4vw,14px)", whiteSpace: "nowrap" };
  const add: React.CSSProperties = { width: "clamp(38px,9vw,48px)", height: "clamp(38px,9vw,48px)", borderRadius: "50%", display: "grid", placeItems: "center", background: "#37b92e", border: "2px solid #83ec64", color: "#fff", textDecoration: "none", fontSize: 28, fontWeight: 950 };
  const actionsStyle: React.CSSProperties = { minHeight: 0, display: "grid", gridTemplateRows: "repeat(4,minmax(0,1fr))", gap: 7, overflow: "hidden" };
  const shortcutStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: "8px 5px", borderRadius: 18, background: "#06152f", border: "1px solid #173766", overflow: "hidden" };
  const streakStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 8, padding: "9px 11px 9px 13px", borderRadius: 18, background: "#0a214b", border: "1px solid #173766", minWidth: 0 };
  const bottomNav: React.CSSProperties = { position: "fixed", bottom: "env(safe-area-inset-bottom, 0px)", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 720, height: 68, display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: "#020b1d", borderTop: "1px solid #173766", zIndex: 20 };

  return (
    <main style={page}>
      <div style={shell}>
        <header style={header}>
          <Link href="/profile" style={profile}>
            <div style={avatarWrap}><div style={avatar}>👩🏻</div><div style={badge}>{progress.level}</div></div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: "clamp(18px,4.8vw,25px)", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</strong>
              <div style={row}><b style={{ color: "#ffd21a", fontSize: 8 }}>XP</b><i style={track}><em style={{ display: "block", height: "100%", width: `${xpPercent}%`, background: "linear-gradient(90deg,#ffb51b,#ffe15a)" }} /></i><b style={{ color: "#ffd21a", fontSize: 10 }}>{progress.xp}/{required}</b></div>
              <div style={{ ...row, marginTop: 3 }}><b style={{ color: "#8ec5ff", fontSize: 7 }}>LEVEL</b><i style={{ ...track, height: 4 }}><em style={{ display: "block", height: "100%", width: `${levelPercent}%`, background: "linear-gradient(90deg,#1677ff,#4ab3ff)" }} /></i></div>
            </div>
          </Link>
          <div style={walletRow}><span style={walletItem}>🪙 <b>{wallet ? wallet.coins.toLocaleString() : "…"}</b></span><span style={walletItem}>💎 <b>{wallet ? wallet.gems.toLocaleString() : "…"}</b></span><Link href="/shop" style={add}>+</Link></div>
        </header>
        <section style={actionsStyle}>
          {actions.map((a) => <Link key={a.title} href={a.href} style={{ minHeight: 0, display: "grid", gridTemplateColumns: "clamp(54px,12vw,82px) minmax(0,1fr) 20px", alignItems: "center", gap: 10, padding: "5px 12px", borderRadius: 18, border: "1px solid rgba(255,255,255,.25)", color: "#fff", textDecoration: "none", background: a.bg, boxShadow: "0 4px 12px rgba(0,0,0,.18)" }}><span style={{ textAlign: "center", fontSize: "clamp(32px,7vw,52px)", lineHeight: 1 }}>{a.icon}</span><span style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: "clamp(15px,3.6vw,25px)", lineHeight: 1.05, fontWeight: 950 }}>{a.title}</b><small style={{ display: "block", marginTop: 4, fontSize: "clamp(9px,2vw,14px)", lineHeight: 1.15, fontWeight: 750 }}>{a.sub}</small></span><span style={{ fontSize: 30, textAlign: "center" }}>›</span></Link>)}
        </section>
        <section style={shortcutStyle}>{shortcuts.map(([icon, label, href]) => <Link key={label} href={href} style={{ display: "grid", placeItems: "center", alignContent: "center", gap: 4, color: "#fff", textDecoration: "none", fontSize: "clamp(9px,2.4vw,13px)", textAlign: "center" }}><span style={{ fontSize: "clamp(25px,7vw,38px)", lineHeight: 1 }}>{icon}</span><b style={{ whiteSpace: "nowrap" }}>{label}</b></Link>)}</section>
        <section style={streakStyle}><div style={{ minWidth: 0 }}><b style={{ display: "block", color: "#ffd21a", fontSize: "clamp(12px,3vw,16px)" }}>🔥 DAILY STREAK</b><span style={{ display: "block", marginTop: 3, color: "#a9bddb", fontSize: "clamp(9px,2.5vw,13px)", whiteSpace: "nowrap" }}>Keep playing to unlock bigger rewards.</span></div><button type="button" style={{ border: 0, borderRadius: 12, padding: "11px clamp(13px,3.5vw,20px)", background: "#ffd21a", color: "#111", fontWeight: 950, fontSize: "clamp(10px,2.7vw,14px)" }}>CLAIM</button></section>
      </div>
      <nav style={bottomNav}>{nav.map(([icon, label, href], i) => <Link key={label} href={href} style={{ display: "grid", placeItems: "center", alignContent: "center", gap: 1, color: i === 0 ? "#fff" : "#9eb3d7", background: i === 0 ? "#123a72" : "transparent", textDecoration: "none", fontSize: "clamp(12px,3vw,17px)", fontWeight: 950 }}><span style={{ fontSize: "clamp(23px,6vw,31px)", lineHeight: 1 }}>{icon}</span><b>{label}</b></Link>)}</nav>
    </main>
  );
}
