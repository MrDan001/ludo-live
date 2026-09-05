"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readProgress, xpRequiredForLevel } from "../../lib/playerProgress";
import EquippedAvatar from "../_components/EquippedAvatar";

type Wallet = { coins: number; gems: number };

type Action = {
  icon: string;
  title: string;
  sub: string;
  href: string;
  bg: string;
};

const actions: Action[] = [
  { icon: "🌐", title: "PLAY ONLINE", sub: "Find open rooms and play real players", href: "/lobby", bg: "linear-gradient(135deg,#159447,#31c936)" },
  { icon: "🏆", title: "TOURNAMENTS", sub: "Enter competitions and fight for rewards", href: "/tournament", bg: "linear-gradient(135deg,#6b1998,#a126c8)" },
  { icon: "🎮", title: "PLAY SOLO", sub: "Play solo and sharpen your skills", href: "/mood", bg: "linear-gradient(135deg,#b86b12,#e39a24)" },
  { icon: "👥", title: "FRIENDS", sub: "", href: "/friends", bg: "linear-gradient(135deg,#087b61,#16b875)" },
];

const shortcuts = [
  ["🎁", "Daily Reward", "/rewards"],
  ["🛒", "Shop", "/shop"],
  ["📅", "Events", "/events"],
  ["🎡", "Spin Wheel", "/spin"],
] as const;

const nav = [
  ["⌂", "Home", "/home"],
  ["🎯", "Missions", "/missions"],
  ["💬", "Chat", "/chat"],
  ["👤", "Profile", "/profile"],
] as const;

export default function HomePage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState("PlayerOne");
  const [progress, setProgress] = useState(() => readProgress());

  useEffect(() => {
    let alive = true;

    const refreshWallet = async () => {
      try {
        const response = await fetch("/api/wallet", { cache: "no-store" });
        const data = await response.json();
        if (alive && response.ok && data?.wallet) {
          setWallet({
            coins: Number(data.wallet.coins) || 0,
            gems: Number(data.wallet.gems) || 0,
          });
        }
      } catch {
        // Keep the current wallet display during transient network failures.
      }
    };

    refreshWallet();
    setName(localStorage.getItem("ludo-player-name") || "PlayerOne");
    setProgress(readProgress());

    const walletTimer = window.setInterval(refreshWallet, 15000);
    const refreshProgress = () => setProgress(readProgress());

    window.addEventListener("focus", refreshWallet);
    window.addEventListener("ludo-wallet-updated", refreshWallet);
    window.addEventListener("ludo-progression-updated", refreshProgress);

    return () => {
      alive = false;
      window.clearInterval(walletTimer);
      window.removeEventListener("focus", refreshWallet);
      window.removeEventListener("ludo-wallet-updated", refreshWallet);
      window.removeEventListener("ludo-progression-updated", refreshProgress);
    };
  }, []);

  const required = Math.max(1, xpRequiredForLevel(progress.level));
  const xpPercent = Math.min(100, Math.max(0, (progress.xp / required) * 100));

  return (
    <main style={page}>
      <div style={content}>
        <header style={header}>
          <Link href="/profile" style={profileLink}>
            <div style={avatarWrap}>
              <div style={avatar}><EquippedAvatar /></div>
              <div style={levelBadge}>{progress.level}</div>
            </div>
            <div style={profileCopy}>
              <strong style={nameStyle}>{name}</strong>
              <div style={xpRow}>
                <i style={xpTrack}><em style={{ ...xpFill, width: `${xpPercent}%` }} /></i>
              </div>
              <div style={levelRow}>
                <b style={levelLabel}>LEVEL {progress.level}</b>
                <i style={levelTrack}><em style={{ ...levelFill, width: `${xpPercent}%` }} /></i>
                <b style={levelNext}>LVL {progress.level + 1}</b>
              </div>
            </div>
          </Link>

          <div style={walletRow}>
            <span style={walletItem}>🪙 <b>{wallet ? wallet.coins.toLocaleString() : "…"}</b></span>
            <span style={walletItem}>💎 <b>{wallet ? wallet.gems.toLocaleString() : "…"}</b></span>
            <Link href="/shop" style={addButton}>+</Link>
          </div>
        </header>

        <section style={actionsSection}>
          {actions.map((action) => (
            <Link key={action.title} href={action.href} style={{ ...actionCard, background: action.bg }}>
              <span style={actionIcon}>{action.icon}</span>
              <span style={actionCopy}>
                <b style={actionTitle}>{action.title}</b>
                {action.sub && <small style={actionSub}>{action.sub}</small>}
              </span>
              <span style={actionArrow}>›</span>
            </Link>
          ))}
        </section>

        <section style={shortcutSection}>
          {shortcuts.map(([icon, label, href]) => (
            <Link key={label} href={href} style={shortcut}>
              <span style={shortcutIcon}>{icon}</span>
              <b>{label}</b>
            </Link>
          ))}
        </section>

        <section style={inventorySection}>
          <Link href="/inventory" style={inventoryLink}>
            <span style={inventoryIcon}>🎒</span>
            <b>Inventory</b>
          </Link>
        </section>
      </div>

      <nav style={bottomNav}>
        {nav.map(([icon, label, href], index) => (
          <Link
            key={label}
            href={href}
            style={{
              ...navItem,
              color: index === 0 ? "#fff" : "#9eb3d7",
              background: index === 0 ? "#123a72" : "transparent",
            }}
          >
            <span style={navIcon}>{icon}</span>
            <b>{label}</b>
          </Link>
        ))}
      </nav>
    </main>
  );
}

const page: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  width: "100%",
  height: "100svh",
  overflow: "hidden",
  background: "linear-gradient(180deg,#031536 0%,#020b1d 52%,#010611 100%)",
  color: "#fff",
  fontFamily: "Arial,Helvetica,sans-serif",
};

const content: React.CSSProperties = {
  width: "min(100%, 480px)",
  height: "calc(100svh - 68px - env(safe-area-inset-bottom,0px))",
  margin: "0 auto",
  padding: "7px 12px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  flex: "0 0 auto",
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) auto",
  alignItems: "center",
  gap: 7,
  minHeight: 70,
};

const profileLink: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  minWidth: 0,
  color: "#fff",
  textDecoration: "none",
};

const avatarWrap: React.CSSProperties = {
  position: "relative",
  flex: "0 0 clamp(52px,13vw,64px)",
  width: "clamp(52px,13vw,64px)",
  height: "clamp(52px,13vw,64px)",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(145deg,#ffe45c,#ffb300)",
  border: "3px solid #ffd43b",
};

const avatar: React.CSSProperties = {
  width: "82%",
  height: "82%",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "#c58a54",
  border: "2px solid #8b5a32",
  fontSize: "clamp(27px,7vw,36px)",
  overflow: "hidden",
};

const levelBadge: React.CSSProperties = {
  position: "absolute",
  bottom: -7,
  left: "50%",
  transform: "translateX(-50%)",
  minWidth: 30,
  height: 21,
  borderRadius: 7,
  display: "grid",
  placeItems: "center",
  background: "#ffd21a",
  color: "#111",
  border: "2px solid #f5b900",
  fontSize: 12,
  fontWeight: 950,
};

const profileCopy: React.CSSProperties = {
  minWidth: 0,
  flex: 1,
};

const nameStyle: React.CSSProperties = {
  display: "block",
  fontSize: "clamp(18px,4.8vw,25px)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const xpRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  marginTop: 5,
  minWidth: 0,
};

const xpTrack: React.CSSProperties = {
  display: "block",
  flex: 1,
  minWidth: 30,
  height: 5,
  borderRadius: 99,
  background: "#102746",
  overflow: "hidden",
};

const xpFill: React.CSSProperties = {
  display: "block",
  height: "100%",
  background: "linear-gradient(90deg,#37c8ff,#7df5ff)",
};

const levelRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  marginTop: 3,
  minWidth: 0,
};

const levelTrack: React.CSSProperties = {
  display: "block",
  flex: 1,
  minWidth: 30,
  height: 9,
  borderRadius: 99,
  background: "#102746",
  overflow: "hidden",
};

const levelFill: React.CSSProperties = {
  display: "block",
  height: "100%",
  background: "linear-gradient(90deg,#ffb51b,#ffe15a)",
};

const levelLabel: React.CSSProperties = {
  color: "#ffd21a",
  fontSize: 8,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const levelNext: React.CSSProperties = {
  color: "#ffd21a",
  fontSize: 8,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const walletRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const walletItem: React.CSSProperties = {
  padding: "7px 8px",
  borderRadius: 11,
  background: "#051737",
  border: "1px solid #173766",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const addButton: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "#37b92e",
  border: "2px solid #83ec64",
  color: "#fff",
  textDecoration: "none",
  fontSize: 28,
  fontWeight: 950,
};

const actionsSection: React.CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 7,
  marginTop: 9,
};

const actionCard: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "clamp(52px,14vw,68px) minmax(0,1fr) 24px",
  alignItems: "center",
  gap: 9,
  minHeight: "clamp(78px,18vw,96px)",
  padding: "7px 12px",
  boxSizing: "border-box",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,.25)",
  color: "#fff",
  textDecoration: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,.18)",
};

const actionIcon: React.CSSProperties = {
  textAlign: "center",
  fontSize: "clamp(34px,8vw,52px)",
  lineHeight: 1,
};

const actionCopy: React.CSSProperties = {
  minWidth: 0,
};

const actionTitle: React.CSSProperties = {
  display: "block",
  fontSize: "clamp(16px,4vw,24px)",
  lineHeight: 1.05,
  fontWeight: 950,
};

const actionSub: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  fontSize: "clamp(9px,2.15vw,14px)",
  lineHeight: 1.15,
  fontWeight: 750,
};

const actionArrow: React.CSSProperties = {
  fontSize: 30,
  lineHeight: 1,
  textAlign: "center",
};

const shortcutSection: React.CSSProperties = {
  flex: "0 0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
  minHeight: 88,
  marginTop: 8,
  padding: "8px 5px",
  boxSizing: "border-box",
  borderRadius: 18,
  background: "#06152f",
  border: "1px solid #173766",
};

const shortcut: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 4,
  minWidth: 0,
  color: "#fff",
  textDecoration: "none",
  fontSize: "clamp(9px,2.4vw,13px)",
  textAlign: "center",
};

const shortcutIcon: React.CSSProperties = {
  fontSize: "clamp(25px,7vw,38px)",
  lineHeight: 1,
};

const inventorySection: React.CSSProperties = {
  flex: "0 0 auto",
  minHeight: 76,
  marginTop: "auto",
  paddingTop: 8,
  boxSizing: "border-box",
};

const inventoryLink: React.CSSProperties = {
  minHeight: 68,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "8px 10px",
  boxSizing: "border-box",
  borderRadius: 18,
  background: "#0a214b",
  border: "1px solid #173766",
  color: "#fff",
  textDecoration: "none",
  fontSize: "clamp(14px,4vw,20px)",
  fontWeight: 950,
};

const inventoryIcon: React.CSSProperties = {
  fontSize: "clamp(26px,7vw,38px)",
  lineHeight: 1,
};

const bottomNav: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: "env(safe-area-inset-bottom,0px)",
  width: "100%",
  height: 68,
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  background: "#020b1d",
  borderTop: "1px solid #173766",
  zIndex: 20,
};

const navItem: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 1,
  textDecoration: "none",
  fontSize: "clamp(12px,3vw,17px)",
  fontWeight: 950,
};

const navIcon: React.CSSProperties = {
  fontSize: "clamp(23px,6vw,31px)",
  lineHeight: 1,
};