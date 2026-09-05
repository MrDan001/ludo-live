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
  { icon: "🌐", title: "PLAY ONLINE", sub: "Find open rooms and play real players", href: "/lobby", bg: "linear-gradient(135deg,#159447 0%,#31c936 100%)" },
  { icon: "🏆", title: "TOURNAMENTS", sub: "Enter competitions and fight for rewards", href: "/tournament", bg: "linear-gradient(135deg,#6b1998 0%,#a126c8 100%)" },
  { icon: "🎮", title: "PLAY SOLO", sub: "Play solo and sharpen your skills", href: "/mood", bg: "linear-gradient(135deg,#b86b12 0%,#e39a24 100%)" },
  { icon: "👥", title: "FRIENDS", sub: "", href: "/friends", bg: "linear-gradient(135deg,#087b61 0%,#16b875 100%)" },
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
    <main className="ludo-home-page">
      <div className="ludo-home-content">
        <header className="ludo-home-header">
          <Link href="/profile" className="ludo-profile-link">
            <div className="ludo-avatar-wrap">
              <div className="ludo-avatar"><EquippedAvatar /></div>
              <div className="ludo-level-badge">{progress.level}</div>
            </div>
            <div className="ludo-profile-copy">
              <strong className="ludo-name">{name}</strong>
              <div className="ludo-xp-row">
                <i className="ludo-xp-track"><em style={{ width: `${xpPercent}%` }} /></i>
              </div>
              <div className="ludo-level-row">
                <b>LEVEL {progress.level}</b>
                <i className="ludo-level-track"><em style={{ width: `${xpPercent}%` }} /></i>
                <b>LVL {progress.level + 1}</b>
              </div>
            </div>
          </Link>

          <div className="ludo-wallet-row">
            <span className="ludo-wallet-item">🪙 <b>{wallet ? wallet.coins.toLocaleString() : "…"}</b></span>
            <span className="ludo-wallet-item">💎 <b>{wallet ? wallet.gems.toLocaleString() : "…"}</b></span>
            <Link href="/shop" className="ludo-add-button">+</Link>
          </div>
        </header>

        <section className="ludo-actions" aria-label="Main game actions">
          {actions.map((action) => (
            <Link key={action.title} href={action.href} className="ludo-action-card" style={{ background: action.bg }}>
              <span className="ludo-action-icon" aria-hidden="true">{action.icon}</span>
              <span className="ludo-action-copy">
                <b className="ludo-action-title">{action.title}</b>
                {action.sub && <small className="ludo-action-sub">{action.sub}</small>}
              </span>
              <span className="ludo-action-arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </section>

        <section className="ludo-shortcuts" aria-label="Quick links">
          {shortcuts.map(([icon, label, href]) => (
            <Link key={label} href={href} className="ludo-shortcut">
              <span className="ludo-shortcut-icon" aria-hidden="true">{icon}</span>
              <b>{label}</b>
            </Link>
          ))}
        </section>

        <section className="ludo-inventory-section">
          <Link href="/inventory" className="ludo-inventory-link">
            <span className="ludo-inventory-icon" aria-hidden="true">🎒</span>
            <b>Inventory</b>
          </Link>
        </section>
      </div>

      <nav className="ludo-bottom-nav" aria-label="Primary navigation">
        {nav.map(([icon, label, href], index) => (
          <Link key={label} href={href} className={`ludo-nav-item ${index === 0 ? "active" : ""}`}>
            <span className="ludo-nav-icon" aria-hidden="true">{icon}</span>
            <b>{label}</b>
          </Link>
        ))}
      </nav>

      <style jsx global>{`
        html,
        body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }

        body {
          overflow: hidden;
          background: #020817;
        }

        .ludo-home-page,
        .ludo-home-page * {
          box-sizing: border-box;
        }

        .ludo-home-page {
          --home-nav-height: 74px;
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
          background: linear-gradient(180deg, #031536 0%, #020b1d 52%, #010611 100%);
          color: #fff;
          font-family: Arial, Helvetica, sans-serif;
          isolation: isolate;
        }

        .ludo-home-content {
          position: relative;
          width: min(100%, 760px);
          height: calc(100dvh - var(--home-nav-height) - env(safe-area-inset-bottom, 0px));
          min-height: 0;
          margin: 0 auto;
          padding: max(8px, env(safe-area-inset-top, 0px)) 14px 10px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .ludo-home-header {
          flex: 0 0 auto;
          min-width: 0;
          min-height: 66px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: clamp(6px, 1.2vw, 12px);
        }

        .ludo-profile-link {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: clamp(7px, 1.4vw, 11px);
          color: #fff;
          text-decoration: none;
        }

        .ludo-avatar-wrap {
          position: relative;
          flex: 0 0 clamp(52px, 9vw, 68px);
          width: clamp(52px, 9vw, 68px);
          height: clamp(52px, 9vw, 68px);
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: linear-gradient(145deg, #ffe45c, #ffb300);
          border: 3px solid #ffd43b;
        }

        .ludo-avatar {
          width: 82%;
          height: 82%;
          display: grid;
          place-items: center;
          border-radius: 50%;
          overflow: hidden;
          background: #c58a54;
          border: 2px solid #8b5a32;
          font-size: clamp(27px, 5vw, 38px);
        }

        .ludo-level-badge {
          position: absolute;
          left: 50%;
          bottom: -7px;
          transform: translateX(-50%);
          min-width: 30px;
          height: 21px;
          padding: 0 5px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: #ffd21a;
          color: #111;
          border: 2px solid #f5b900;
          font-size: 12px;
          line-height: 1;
          font-weight: 950;
        }

        .ludo-profile-copy {
          min-width: 0;
          flex: 1 1 auto;
        }

        .ludo-name {
          display: block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: clamp(17px, 4.2vw, 25px);
          line-height: 1.05;
        }

        .ludo-xp-row {
          width: 100%;
          margin-top: 5px;
        }

        .ludo-xp-track,
        .ludo-level-track {
          display: block;
          width: 100%;
          overflow: hidden;
          border-radius: 999px;
          background: #102746;
        }

        .ludo-xp-track {
          height: 5px;
        }

        .ludo-xp-track em,
        .ludo-level-track em {
          display: block;
          height: 100%;
          border-radius: inherit;
        }

        .ludo-xp-track em {
          background: linear-gradient(90deg, #37c8ff, #7df5ff);
        }

        .ludo-level-row {
          min-width: 0;
          display: grid;
          grid-template-columns: auto minmax(25px, 1fr) auto;
          align-items: center;
          gap: 5px;
          margin-top: 3px;
          color: #ffd21a;
          font-size: clamp(7px, 1.7vw, 10px);
          line-height: 1;
        }

        .ludo-level-row b {
          white-space: nowrap;
          font-weight: 950;
        }

        .ludo-level-track {
          height: 9px;
        }

        .ludo-level-track em {
          background: linear-gradient(90deg, #ffb51b, #ffe15a);
        }

        .ludo-wallet-row {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: clamp(4px, 0.9vw, 7px);
        }

        .ludo-wallet-item {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: clamp(6px, 1.1vw, 8px) clamp(6px, 1.3vw, 10px);
          border-radius: 11px;
          background: #051737;
          border: 1px solid #173766;
          font-size: clamp(9px, 1.9vw, 13px);
          line-height: 1;
          white-space: nowrap;
        }

        .ludo-add-button {
          flex: 0 0 clamp(40px, 7vw, 48px);
          width: clamp(40px, 7vw, 48px);
          height: clamp(40px, 7vw, 48px);
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #37b92e;
          border: 2px solid #83ec64;
          color: #fff;
          text-decoration: none;
          font-size: clamp(25px, 4.8vw, 31px);
          line-height: 1;
          font-weight: 950;
        }

        .ludo-actions {
          flex: 0 0 clamp(312px, 37dvh, 550px);
          min-height: 0;
          margin-top: clamp(7px, 1dvh, 12px);
          display: grid;
          grid-template-rows: repeat(4, minmax(0, 1fr));
          gap: clamp(6px, 0.85dvh, 12px);
        }

        .ludo-action-card {
          min-width: 0;
          min-height: 0;
          display: grid;
          grid-template-columns: clamp(48px, 9vw, 76px) minmax(0, 1fr) 22px;
          align-items: center;
          gap: clamp(7px, 1.4vw, 12px);
          padding: clamp(7px, 1.1vw, 12px) clamp(10px, 1.8vw, 16px);
          border-radius: clamp(15px, 2.5vw, 21px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 5px 14px rgba(0, 0, 0, 0.2);
          color: #fff;
          text-decoration: none;
          overflow: hidden;
        }

        .ludo-action-icon {
          min-width: 0;
          display: grid;
          place-items: center;
          font-size: clamp(34px, 7vw, 55px);
          line-height: 1;
        }

        .ludo-action-copy {
          min-width: 0;
          overflow: hidden;
        }

        .ludo-action-title {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: clamp(16px, 3.2vw, 25px);
          line-height: 1.05;
          font-weight: 950;
        }

        .ludo-action-sub {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: clamp(9px, 1.8vw, 14px);
          line-height: 1.15;
          font-weight: 750;
        }

        .ludo-action-arrow {
          display: grid;
          place-items: center;
          font-size: clamp(25px, 4vw, 34px);
          line-height: 1;
        }

        .ludo-shortcuts {
          flex: 0 0 clamp(78px, 10dvh, 118px);
          min-height: 0;
          margin-top: clamp(7px, 1dvh, 12px);
          padding: 7px 4px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: stretch;
          border-radius: clamp(15px, 2.5vw, 20px);
          background: #06152f;
          border: 1px solid #173766;
        }

        .ludo-shortcut {
          min-width: 0;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 4px;
          padding: 2px 3px;
          color: #fff;
          text-decoration: none;
          text-align: center;
          overflow: hidden;
        }

        .ludo-shortcut-icon {
          display: block;
          font-size: clamp(25px, 5.8vw, 40px);
          line-height: 1;
        }

        .ludo-shortcut b {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: clamp(9px, 1.9vw, 13px);
          line-height: 1.1;
        }

        .ludo-inventory-section {
          flex: 0 0 clamp(64px, 8dvh, 88px);
          min-height: 0;
          margin-top: auto;
          padding-top: clamp(7px, 1dvh, 11px);
        }

        .ludo-inventory-link {
          width: 100%;
          height: 100%;
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: clamp(15px, 2.5vw, 20px);
          background: #0a214b;
          border: 1px solid #173766;
          color: #fff;
          text-decoration: none;
          font-size: clamp(15px, 3vw, 22px);
          line-height: 1;
        }

        .ludo-inventory-icon {
          font-size: clamp(30px, 6vw, 43px);
          line-height: 1;
        }

        .ludo-bottom-nav {
          position: fixed;
          z-index: 20;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: var(--home-nav-height);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          background: #020b1b;
          border-top: 1px solid #17325b;
        }

        .ludo-nav-item {
          min-width: 0;
          min-height: 0;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 3px;
          color: #9eb3d7;
          text-decoration: none;
          text-align: center;
          font-size: clamp(10px, 2.3vw, 14px);
          line-height: 1;
          overflow: hidden;
        }

        .ludo-nav-item.active {
          color: #fff;
          background: #123a72;
        }

        .ludo-nav-icon {
          display: block;
          font-size: clamp(25px, 5.8vw, 38px);
          line-height: 1;
        }

        @media (max-width: 420px) {
          .ludo-home-content {
            padding-left: 10px;
            padding-right: 10px;
          }

          .ludo-home-header {
            gap: 5px;
          }

          .ludo-wallet-row {
            gap: 3px;
          }

          .ludo-wallet-item {
            padding-left: 5px;
            padding-right: 5px;
          }

          .ludo-action-card {
            grid-template-columns: 45px minmax(0, 1fr) 20px;
            gap: 6px;
            padding-left: 8px;
            padding-right: 8px;
          }

          .ludo-action-icon {
            font-size: 35px;
          }

          .ludo-action-title {
            font-size: 16px;
          }

          .ludo-action-sub {
            font-size: 9px;
          }
        }

        @media (max-height: 720px) {
          .ludo-home-page {
            --home-nav-height: 68px;
          }

          .ludo-home-header {
            min-height: 58px;
          }

          .ludo-actions {
            flex-basis: 292px;
          }

          .ludo-shortcuts {
            flex-basis: 70px;
          }

          .ludo-inventory-section {
            flex-basis: 60px;
          }

          .ludo-nav-icon {
            font-size: 25px;
          }
        }
      `}</style>
    </main>
  );
}
