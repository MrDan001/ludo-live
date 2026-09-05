"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readProgress, xpRequiredForLevel } from "../../lib/playerProgress";
import EquippedAvatar from "../_components/EquippedAvatar";

type Wallet = { coins: number; gems: number };

type Action = { icon: string; title: string; sub: string; href: string; className: string };

const actions: Action[] = [
  { icon: "🌐", title: "PLAY ONLINE", sub: "Find open rooms and play real players", href: "/lobby", className: "online" },
  { icon: "🏆", title: "TOURNAMENTS", sub: "Enter competitions and fight for rewards", href: "/tournament", className: "tournament" },
  { icon: "🎮", title: "PLAY SOLO", sub: "Play solo and sharpen your skills", href: "/mood", className: "solo" },
  { icon: "👥", title: "FRIENDS", sub: "", href: "/friends", className: "friends" },
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
        // Keep the current wallet during transient failures.
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
    <main className="home-screen">
      <div className="home-body">
        <header className="home-header">
          <Link href="/profile" className="profile">
            <div className="avatar-wrap">
              <div className="avatar"><EquippedAvatar /></div>
              <span className="level-badge">{progress.level}</span>
            </div>
            <div className="profile-info">
              <strong className="player-name">{name}</strong>
              <div className="level-line">
                <b>LEVEL {progress.level}</b>
                <span className="xp-bar"><i style={{ width: `${xpPercent}%` }} /></span>
                <b>LVL {progress.level + 1}</b>
              </div>
            </div>
          </Link>

          <div className="wallet">
            <span>🪙 <b>{wallet ? wallet.coins.toLocaleString() : "…"}</b></span>
            <span>💎 <b>{wallet ? wallet.gems.toLocaleString() : "…"}</b></span>
            <Link href="/shop" className="add">+</Link>
          </div>
        </header>

        <section className="actions" aria-label="Main game actions">
          {actions.map((action) => (
            <Link key={action.title} href={action.href} className={`action ${action.className}`}>
              <span className="action-icon" aria-hidden="true">{action.icon}</span>
              <span className="action-copy">
                <b>{action.title}</b>
                {action.sub && <small>{action.sub}</small>}
              </span>
              <span className="arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </section>

        <section className="shortcuts" aria-label="Quick links">
          {shortcuts.map(([icon, label, href]) => (
            <Link key={label} href={href} className="shortcut">
              <span>{icon}</span>
              <b>{label}</b>
            </Link>
          ))}
        </section>

        <Link href="/inventory" className="inventory">
          <span>🎒</span>
          <b>Inventory</b>
        </Link>
      </div>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {nav.map(([icon, label, href], index) => (
          <Link key={label} href={href} className={index === 0 ? "active" : ""}>
            <span>{icon}</span>
            <b>{label}</b>
          </Link>
        ))}
      </nav>

      <style jsx global>{`
        :root { background: #020817; }
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
        body { overflow: hidden; background: #020817; font-family: Arial, Helvetica, sans-serif; }
        *, *::before, *::after { box-sizing: border-box; }

        .home-screen {
          --nav-h: 74px;
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
          color: #fff;
          background: linear-gradient(180deg, #061a3b 0%, #03122d 44%, #020817 100%);
        }

        .home-body {
          width: min(100%, 760px);
          height: calc(100dvh - var(--nav-h) - env(safe-area-inset-bottom, 0px));
          min-height: 0;
          margin: 0 auto;
          padding: max(8px, env(safe-area-inset-top, 0px)) 17px 8px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto auto;
          gap: clamp(8px, 1.1dvh, 14px);
          overflow: hidden;
        }

        .home-header {
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
        }

        .profile {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #fff;
          text-decoration: none;
        }

        .avatar-wrap {
          position: relative;
          flex: 0 0 clamp(56px, 10vw, 68px);
          width: clamp(56px, 10vw, 68px);
          height: clamp(56px, 10vw, 68px);
          display: grid;
          place-items: center;
          border: 3px solid #ffd43b;
          border-radius: 50%;
          background: linear-gradient(145deg, #ffe45c, #ffad00);
        }

        .avatar {
          width: 82%;
          height: 82%;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 2px solid #8b5a32;
          border-radius: 50%;
          background: #c58a54;
          font-size: 30px;
        }

        .level-badge {
          position: absolute;
          left: 50%;
          bottom: -7px;
          transform: translateX(-50%);
          min-width: 30px;
          height: 21px;
          padding: 0 5px;
          display: grid;
          place-items: center;
          border: 2px solid #f5b900;
          border-radius: 7px;
          background: #ffd21a;
          color: #111;
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
        }

        .profile-info { min-width: 0; flex: 1; }
        .player-name {
          display: block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: clamp(19px, 4.8vw, 27px);
          line-height: 1.05;
        }

        .level-line {
          min-width: 0;
          margin-top: 7px;
          display: grid;
          grid-template-columns: auto minmax(35px, 1fr) auto;
          align-items: center;
          gap: 5px;
          color: #ffd21a;
          font-size: clamp(8px, 1.9vw, 11px);
          line-height: 1;
        }
        .level-line b { white-space: nowrap; font-weight: 950; }
        .xp-bar { height: 10px; overflow: hidden; border-radius: 999px; background: #102746; }
        .xp-bar i { display: block; height: 100%; border-radius: inherit; background: #ffc928; }

        .wallet {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
        }
        .wallet span {
          padding: 8px 9px;
          border: 1px solid #1b3b6d;
          border-radius: 12px;
          background: #061737;
          color: #fff;
          font-size: clamp(9px, 1.9vw, 13px);
          white-space: nowrap;
        }
        .add {
          width: clamp(44px, 7vw, 52px);
          height: clamp(44px, 7vw, 52px);
          display: grid;
          place-items: center;
          border: 2px solid #86ed67;
          border-radius: 50%;
          background: #36b92e;
          color: #fff;
          text-decoration: none;
          font-size: 31px;
          font-weight: 950;
          line-height: 1;
        }

        .actions {
          min-height: 0;
          display: grid;
          grid-template-rows: repeat(4, minmax(0, 1fr));
          gap: clamp(7px, 1.05dvh, 13px);
        }
        .action {
          min-height: 0;
          display: grid;
          grid-template-columns: clamp(55px, 10vw, 78px) minmax(0, 1fr) 24px;
          align-items: center;
          gap: clamp(8px, 1.6vw, 14px);
          padding: 8px 14px;
          border: 1px solid rgba(255,255,255,.28);
          border-radius: 20px;
          color: #fff;
          text-decoration: none;
          box-shadow: 0 5px 14px rgba(0,0,0,.2);
          overflow: hidden;
        }
        .action.online { background: linear-gradient(135deg, #159447, #31c936); }
        .action.tournament { background: linear-gradient(135deg, #6b1998, #a126c8); }
        .action.solo { background: linear-gradient(135deg, #b86b12, #e39a24); }
        .action.friends { background: linear-gradient(135deg, #087b61, #16b875); }
        .action-icon { display: grid; place-items: center; font-size: clamp(36px, 7vw, 58px); line-height: 1; }
        .action-copy { min-width: 0; overflow: hidden; }
        .action-copy b {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: clamp(17px, 3.7vw, 26px);
          line-height: 1.05;
          font-weight: 950;
        }
        .action-copy small {
          display: block;
          margin-top: 5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: clamp(9px, 2vw, 13px);
          font-weight: 700;
        }
        .arrow { font-size: 35px; font-weight: 300; line-height: 1; text-align: right; }

        .shortcuts {
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid #193866;
          border-radius: 19px;
          background: #061735;
          overflow: hidden;
        }
        .shortcut {
          min-width: 0;
          min-height: 0;
          padding: 9px 3px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #fff;
          text-decoration: none;
        }
        .shortcut span { font-size: clamp(28px, 6vw, 42px); line-height: 1; }
        .shortcut b { font-size: clamp(9px, 2vw, 13px); white-space: nowrap; }

        .inventory {
          min-height: clamp(58px, 8dvh, 78px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          border: 1px solid #193866;
          border-radius: 19px;
          background: #0b2759;
          color: #fff;
          text-decoration: none;
        }
        .inventory span { font-size: clamp(34px, 7vw, 48px); line-height: 1; }
        .inventory b { font-size: clamp(18px, 4vw, 25px); }

        .bottom-nav {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-top: 1px solid #17325b;
          background: #020b1b;
          z-index: 10;
        }
        .bottom-nav a {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: #9eb3d7;
          text-decoration: none;
        }
        .bottom-nav a span { font-size: clamp(27px, 6vw, 39px); line-height: 1; }
        .bottom-nav a b { font-size: clamp(10px, 2.5vw, 14px); }
        .bottom-nav a.active { color: #fff; background: #123f78; }

        @media (max-height: 700px) {
          .home-screen { --nav-h: 68px; }
          .home-body { padding-top: 5px; padding-bottom: 5px; gap: 6px; }
          .home-header { min-height: 55px; }
          .avatar-wrap { flex-basis: 52px; width: 52px; height: 52px; }
          .player-name { font-size: 18px; }
          .level-line { margin-top: 4px; }
          .action { padding: 5px 11px; border-radius: 16px; }
          .action-icon { font-size: 35px; }
          .action-copy b { font-size: 16px; }
          .action-copy small { margin-top: 2px; font-size: 9px; }
          .arrow { font-size: 29px; }
          .shortcut { padding: 6px 2px; }
          .shortcut span { font-size: 27px; }
          .shortcut b { font-size: 9px; }
          .inventory { min-height: 50px; }
          .inventory span { font-size: 30px; }
          .inventory b { font-size: 17px; }
        }

        @media (max-width: 430px) {
          .home-body { padding-left: 12px; padding-right: 12px; }
          .wallet span { padding: 7px 6px; }
          .add { width: 44px; height: 44px; font-size: 27px; }
          .action { grid-template-columns: 55px minmax(0, 1fr) 20px; padding-left: 9px; padding-right: 9px; }
          .action-icon { font-size: 39px; }
        }
      `}</style>
    </main>
  );
}
