"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readProgress, xpRequiredForLevel } from "../../lib/playerProgress";

type Wallet = { coins: number; gems: number };

export default function HomePage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState("PlayerOne");
  const [progress, setProgress] = useState(() => readProgress());

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const r = await fetch("/api/wallet", { cache: "no-store" });
        const d = await r.json();
        if (alive && r.ok && d?.wallet) setWallet({ coins: Number(d.wallet.coins) || 0, gems: Number(d.wallet.gems) || 0 });
      } catch {}
    };
    refresh();
    setName(localStorage.getItem("ludo-player-name") || "PlayerOne");
    setProgress(readProgress());
    const t = setInterval(refresh, 15000);
    const f = () => refresh();
    const p = () => setProgress(readProgress());
    window.addEventListener("focus", f);
    window.addEventListener("ludo-wallet-updated", f);
    window.addEventListener("ludo-progression-updated", p);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("focus", f);
      window.removeEventListener("ludo-wallet-updated", f);
      window.removeEventListener("ludo-progression-updated", p);
    };
  }, []);

  const required = xpRequiredForLevel(progress.level);
  const xpPercent = Math.min(100, (progress.xp / required) * 100);
  const levelPercent = Math.min(100, (progress.level / Math.max(progress.level + 1, 1)) * 100);
  const money = wallet ? `${wallet.coins.toLocaleString()}` : "…";
  const gems = wallet ? `${wallet.gems.toLocaleString()}` : "…";

  return (
    <main style={{ position: "fixed", inset: 0, height: "100dvh", minHeight: 0, overflow: "hidden", background: "linear-gradient(180deg,#031536 0%,#020b1d 48%,#010611 100%)", color: "#fff" }}>
      <div style={{ width: "100%", maxWidth: 560, height: "calc(100dvh - 68px)", margin: "0 auto", padding: "5px 12px 0", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <header style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", padding: "4px 2px 5px", flex: "0 0 auto" }}>
          <Link href="/profile" style={{ color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ position: "relative", width: 56, height: 56, flex: "0 0 56px", borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(145deg,#ffe45c,#ffb300)", border: "3px solid #ffd43b", boxShadow: "0 0 0 2px rgba(255,193,7,.22),0 4px 10px rgba(0,0,0,.3)" }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", display: "grid", placeItems: "center", background: "#c58a54", border: "2px solid #8b5a32", overflow: "hidden", fontSize: 32, lineHeight: 1 }}>👩🏻</div>
              <div style={{ position: "absolute", left: "50%", bottom: -8, transform: "translateX(-50%)", minWidth: 31, height: 22, padding: "0 5px", borderRadius: 7, display: "grid", placeItems: "center", background: "#ffd21a", color: "#111", border: "2px solid #f5b900", fontWeight: 950, fontSize: 12 }}>{progress.level}</div>
            </div>
            <div style={{ minWidth: 0, paddingBottom: 1 }}>
              <div style={{ fontWeight: 950, fontSize: 21, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
              <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 8, fontWeight: 950, color: "#ffd21a" }}>XP</span>
                <div style={{ width: "min(108px,27vw)", height: 7, borderRadius: 99, background: "#102746", overflow: "hidden" }}><span style={{ display: "block", width: `${xpPercent}%`, height: "100%", background: "linear-gradient(90deg,#ffb51b,#ffe15a)" }} /></div>
                <span style={{ fontSize: 10, fontWeight: 950, color: "#ffd21a", lineHeight: 1 }}>{progress.xp}/{required}</span>
              </div>
              <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 7, fontWeight: 950, color: "#8ec5ff" }}>LEVEL</span>
                <div style={{ width: "min(108px,27vw)", height: 4, borderRadius: 99, background: "#102746", overflow: "hidden" }}><span style={{ display: "block", width: `${levelPercent}%`, height: "100%", background: "linear-gradient(90deg,#1677ff,#4ab3ff)" }} /></div>
              </div>
            </div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={currency}>🪙 <b>{money}</b></div>
            <div style={currency}>💎 <b>{gems}</b></div>
            <Link href="/shop" style={{ width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", textDecoration: "none", background: "#37b92e", border: "2px solid #83ec64", color: "#fff", fontWeight: 950, fontSize: 22 }}>+</Link>
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateRows: "repeat(4,clamp(118px,11.2dvh,148px))", gap: 6, flex: "0 0 auto", overflow: "hidden" }}>
          {[
            { icon: "🌐", h: "PLAY ONLINE", s: "See real players waiting in open rooms", href: "/lobby", background: "linear-gradient(135deg,#159447,#31c936)" },
            { icon: "👥", h: "PLAY WITH FRIENDS", s: "Invite friends and play together", href: "/lobby", background: "linear-gradient(135deg,#087b61,#16b875)" },
            { icon: "🎯", h: "MISSIONS", s: "Complete objectives before rewards unlock", href: "/missions", background: "linear-gradient(135deg,#173fba,#1769e8)" },
            { icon: "🏆", h: "TOURNAMENT", s: "Join tournaments and compete for rewards", href: "/mode", background: "linear-gradient(135deg,#6b1998,#a126c8)" },
          ].map((a) => (
            <Link key={a.h} href={a.href} style={{ minHeight: 0, borderRadius: 16, display: "grid", gridTemplateColumns: "68px 1fr 20px", alignItems: "center", padding: "4px 10px", boxSizing: "border-box", color: "#fff", textDecoration: "none", background: a.background, border: "1px solid rgba(255,255,255,.24)", boxShadow: "0 4px 12px rgba(0,0,0,.18)" }}>
              <span style={{ fontSize: "clamp(30px,5.5vw,40px)", lineHeight: 1, textAlign: "center" }}>{a.icon}</span>
              <span><strong style={{ display: "block", fontSize: "clamp(14px,3vw,18px)", fontWeight: 950 }}>{a.h}</strong><small style={{ display: "block", marginTop: 3, fontSize: "clamp(8px,1.9vw,11px)", lineHeight: 1.1, fontWeight: 750 }}>{a.s}</small></span>
              <span style={{ fontSize: 25, opacity: 0.85, textAlign: "center" }}>›</span>
            </Link>
          ))}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, padding: "12px 5px 11px", borderRadius: 18, background: "#06152f", border: "1px solid rgba(77,126,210,.22)", flex: "0 0 auto", height: "clamp(92px,10.5dvh,112px)", boxSizing: "border-box" }}>
          {[["🎁", "Daily Reward", "/daily-reward"], ["🛒", "Shop", "/shop"], ["📅", "Events", "/events"], ["🎡", "Spin Wheel", "/spin"]].map(([icon, label, href]) => (
            <Link key={label} href={href} style={{ color: "#fff", textDecoration: "none", display: "grid", justifyItems: "center", alignContent: "center", gap: 4, fontWeight: 900, fontSize: 10.5, textAlign: "center" }}><span style={{ fontSize: 30, lineHeight: 1 }}>{icon}</span><span>{label}</span></Link>
          ))}
        </section>

        <section style={{ height: "clamp(76px,8.5dvh,94px)", padding: "11px 11px 11px 13px", boxSizing: "border-box", borderRadius: 18, background: "#0a214b", border: "1px solid rgba(77,126,210,.28)", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
          <div><strong style={{ display: "block", color: "#ffd21a", fontSize: 14 }}>🔥 DAILY STREAK</strong><span style={{ display: "block", marginTop: 3, color: "#a9bddb", fontSize: 11 }}>Keep playing to unlock bigger rewards.</span></div>
          <button type="button" style={{ border: 0, borderRadius: 12, padding: "12px 17px", background: "#ffd21a", color: "#111", fontWeight: 950, fontSize: 12 }}>CLAIM</button>
        </section>
      </div>

      <nav aria-label="Bottom navigation" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, height: 68, background: "#020b1d", borderTop: "1px solid rgba(91,129,190,.28)", display: "grid", gridTemplateColumns: "repeat(4,1fr)", maxWidth: 560, margin: "0 auto" }}>
        {[["⌂", "Home", "/home"], ["👥", "Friends", "/friends"], ["💬", "Chat", "/chat"], ["👤", "Profile", "/profile"]].map(([icon, label, href], i) => (
          <Link key={label} href={href} style={{ display: "grid", placeItems: "center", alignContent: "center", gap: 1, color: i === 0 ? "#fff" : "#9eb3d7", background: i === 0 ? "#123a72" : "transparent", textDecoration: "none", fontWeight: 950, fontSize: 13 }}><span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span><span>{label}</span></Link>
        ))}
      </nav>
    </main>
  );
}

const currency: React.CSSProperties = { display: "flex", alignItems: "center", gap: 3, padding: "6px 7px", borderRadius: 10, background: "rgba(5,23,55,.9)", border: "1px solid rgba(79,124,204,.24)", fontSize: 11 };
