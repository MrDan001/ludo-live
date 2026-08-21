"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readProgress,
  readBadges,
  xpRequiredForLevel,
  type Badge,
} from "../../lib/playerProgress";

type Wallet = { coins: number; gems: number };

export default function HomePage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState("PlayerOne");
  const [progress, setProgress] = useState(() => readProgress());
  const [badges, setBadges] = useState<Badge[]>(() => readBadges());

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      try {
        const r = await fetch("/api/wallet", { cache: "no-store" });
        const d = await r.json();
        if (alive && r.ok && d?.wallet) {
          setWallet({
            coins: Number(d.wallet.coins) || 0,
            gems: Number(d.wallet.gems) || 0,
          });
        }
      } catch {}
    };

    refresh();
    setName(localStorage.getItem("ludo-player-name") || "PlayerOne");
    setProgress(readProgress());
    setBadges(readBadges());

    const t = setInterval(refresh, 15000);
    const f = () => refresh();
    window.addEventListener("focus", f);
    window.addEventListener("ludo-wallet-updated", f);

    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("focus", f);
      window.removeEventListener("ludo-wallet-updated", f);
    };
  }, []);

  const required = xpRequiredForLevel(progress.level);
  const xpPercent = Math.min(100, (progress.xp / required) * 100);
  const money = wallet ? `${wallet.coins.toLocaleString()}` : "…";
  const gems = wallet ? `${wallet.gems.toLocaleString()}` : "…";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#031536 0%,#020b1d 48%,#010611 100%)",
        color: "#fff",
        paddingBottom: 104,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          margin: "0 auto",
          padding: "12px 14px 0",
          boxSizing: "border-box",
        }}
      >
        {/* Header intentionally preserved. */}
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "center",
            padding: "8px 2px 14px",
          }}
        >
          <Link href="/profile" style={{ color: "#fff", textDecoration: "none" }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>{name}</div>
            <div
              style={{
                marginTop: 5,
                fontSize: 9,
                fontWeight: 900,
                color: "#8ec5ff",
              }}
            >
              LEVEL {progress.level} • XP {Math.round(xpPercent)}%
            </div>
            <div
              style={{
                marginTop: 3,
                width: "min(180px,100%)",
                height: 8,
                borderRadius: 99,
                background: "#102746",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: `${xpPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg,#1677ff,#4ab3ff)",
                }}
              />
            </div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={currency}>🪙 <b>{money}</b></div>
            <div style={currency}>💎 <b>{gems}</b></div>
            <Link
              href="/shop"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                textDecoration: "none",
                background: "#37b92e",
                border: "2px solid #83ec64",
                color: "#fff",
                fontWeight: 950,
                fontSize: 20,
              }}
            >
              +
            </Link>
          </div>
        </header>

        <section style={{ display: "grid", gap: 12 }}>
          {[
            {
              icon: "🌐",
              h: "PLAY ONLINE",
              s: "See real players waiting in open rooms",
              href: "/lobby",
              background: "linear-gradient(135deg,#159447,#31c936)",
            },
            {
              icon: "👥",
              h: "PLAY WITH FRIENDS",
              s: "Invite friends and play together",
              href: "/lobby",
              background: "linear-gradient(135deg,#087b61,#16b875)",
            },
            {
              icon: "🎯",
              h: "MISSIONS",
              s: "Complete objectives before rewards unlock",
              href: "/missions",
              background: "linear-gradient(135deg,#173fba,#1769e8)",
            },
            {
              icon: "🏆",
              h: "TOURNAMENT",
              s: "Join tournaments and compete for rewards",
              href: "/mode",
              background: "linear-gradient(135deg,#6b1998,#a126c8)",
            },
          ].map((a) => (
            <Link
              key={a.h}
              href={a.href}
              style={{
                minHeight: 108,
                borderRadius: 22,
                display: "grid",
                gridTemplateColumns: "112px 1fr 28px",
                alignItems: "center",
                padding: "10px 18px",
                boxSizing: "border-box",
                color: "#fff",
                textDecoration: "none",
                background: a.background,
                border: "1px solid rgba(255,255,255,.24)",
                boxShadow: "0 6px 18px rgba(0,0,0,.18)",
              }}
            >
              <span style={{ fontSize: 58, lineHeight: 1, textAlign: "center" }}>
                {a.icon}
              </span>
              <span>
                <strong style={{ display: "block", fontSize: 20, fontWeight: 950 }}>
                  {a.h}
                </strong>
                <small
                  style={{
                    display: "block",
                    marginTop: 7,
                    fontSize: 12.5,
                    lineHeight: 1.25,
                    fontWeight: 750,
                  }}
                >
                  {a.s}
                </small>
              </span>
              <span style={{ fontSize: 32, opacity: 0.85, textAlign: "center" }}>›</span>
            </Link>
          ))}
        </section>

        <section
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 4,
            padding: "18px 8px 16px",
            borderRadius: 22,
            background: "#06152f",
            border: "1px solid rgba(77,126,210,.22)",
          }}
        >
          {[
            ["🎁", "Daily Reward", "/daily-reward"],
            ["🛒", "Shop", "/shop"],
            ["📅", "Events", "/events"],
            ["🎡", "Spin Wheel", "/spin"],
          ].map(([icon, label, href]) => (
            <Link
              key={label}
              href={href}
              style={{
                color: "#fff",
                textDecoration: "none",
                display: "grid",
                justifyItems: "center",
                gap: 7,
                fontWeight: 900,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 38, lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </section>

        <section
          style={{
            marginTop: 24,
            minHeight: 92,
            padding: "16px 14px 16px 18px",
            boxSizing: "border-box",
            borderRadius: 22,
            background: "#0a214b",
            border: "1px solid rgba(77,126,210,.28)",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <strong style={{ display: "block", color: "#ffd21a", fontSize: 17 }}>
              🔥 DAILY STREAK
            </strong>
            <span style={{ display: "block", marginTop: 5, color: "#a9bddb", fontSize: 13 }}>
              Keep playing to unlock bigger rewards.
            </span>
          </div>
          <button
            type="button"
            style={{
              border: 0,
              borderRadius: 16,
              padding: "16px 20px",
              background: "#ffd21a",
              color: "#111",
              fontWeight: 950,
              fontSize: 14,
            }}
          >
            CLAIM
          </button>
        </section>
      </div>

      <nav
        aria-label="Bottom navigation"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          height: 86,
          background: "#020b1d",
          borderTop: "1px solid rgba(91,129,190,.28)",
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        {[
          ["⌂", "Home", "/home"],
          ["👥", "Friends", "/friends"],
          ["💬", "Chat", "/chat"],
          ["👤", "Profile", "/profile"],
        ].map(([icon, label, href], i) => (
          <Link
            key={label}
            href={href}
            style={{
              display: "grid",
              placeItems: "center",
              alignContent: "center",
              gap: 3,
              color: i === 0 ? "#fff" : "#9eb3d7",
              background: i === 0 ? "#123a72" : "transparent",
              textDecoration: "none",
              fontWeight: 950,
              fontSize: 15,
            }}
          >
            <span style={{ fontSize: 30, lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}

const currency: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "8px 9px",
  borderRadius: 12,
  background: "rgba(5,23,55,.9)",
  border: "1px solid rgba(79,124,204,.24)",
  fontSize: 13,
};
