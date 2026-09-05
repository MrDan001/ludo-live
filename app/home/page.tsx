"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readProgress, xpRequiredForLevel } from "../../lib/playerProgress";
import EquippedAvatar from "../_components/EquippedAvatar";

type Wallet = { coins: number; gems: number };
type Action = { icon: string; title: string; sub: string; href: string; kind: "online" | "tournament" | "solo" | "friends" };

const actions: Action[] = [
  { icon: "🌐", title: "PLAY ONLINE", sub: "Find open rooms and play real players", href: "/lobby", kind: "online" },
  { icon: "🏆", title: "TOURNAMENTS", sub: "Enter competitions and fight for rewards", href: "/tournament", kind: "tournament" },
  { icon: "🎮", title: "PLAY SOLO", sub: "Play solo and sharpen your skills", href: "/mood", kind: "solo" },
  { icon: "👥", title: "FRIENDS", sub: "", href: "/friends", kind: "friends" },
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
        // Keep the existing wallet display through temporary network failures.
      }
    };

    refreshWallet();
    setName(localStorage.getItem("ludo-player-name") || "PlayerOne");
    setProgress(readProgress());

    const timer = window.setInterval(refreshWallet, 15000);
    const refreshProgress = () => setProgress(readProgress());

    window.addEventListener("focus", refreshWallet);
    window.addEventListener("ludo-wallet-updated", refreshWallet);
    window.addEventListener("ludo-progression-updated", refreshProgress);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWallet);
      window.removeEventListener("ludo-wallet-updated", refreshWallet);
      window.removeEventListener("ludo-progression-updated", refreshProgress);
    };
  }, []);

  const required = Math.max(1, xpRequiredForLevel(progress.level));
  const xpPercent = Math.min(100, Math.max(0, (progress.xp / required) * 100));

  return (
    <main className="home-screen">
      <div className="home-inner">
        <header className="home-header">
          <Link href="/profile" className="profile-block">
            <div className="avatar-ring">
              <div className="avatar-image"><EquippedAvatar /></div>
              <div className="level-badge">{progress.level}</div>
            </div>
            <div className="profile-details">
              <strong className="player-name">{name}</strong>
              <div className="xp-track"><span style={{ width: `${xpPercent}%` }} /></div>
              <div className="level-line">
                <b>LEVEL {progress.level}</b>
                <span className="level-progress"><i style={{ width: `${xpPercent}%` }} /></span>
                <b>LVL {progress.level + 1}</b>
              </div>
            </div>
          </Link>

          <div className="wallet">
            <span className="wallet-pill">🪙 <b>{wallet ? wallet.coins.toLocaleString() : "…"}</b></span>
            <span className="wallet-pill">💎 <b>{wallet ? wallet.gems.toLocaleString() : "…"}</b></span>
            <Link href="/shop" className="plus-button" aria-label="Open shop">+</Link>
          </div>
        </header>

        <section className="main-actions" aria-label="Game actions">
          {actions.map((action) => (
            <Link key={action.title} href={action.href} className={`main-action main-action--${action.kind}`}>
              <span className="main-action__icon" aria-hidden="true">{action.icon}</span>
              <span className="main-action__copy">
                <b className="main-action__title">{action.title}</b>
                {action.sub ? <small className="main-action__sub">{action.sub}</small> : null}
              </span>
              <span className="main-action__arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </section>

        <section className="quick-actions" aria-label="Quick actions">
          {shortcuts.map(([icon, label, href]) => (
            <Link key={label} href={href} className="quick-action">
              <span className="quick-action__icon" aria-hidden="true">{icon}</span>
              <b>{label}</b>
            </Link>
          ))}
        </section>

        <Link href="/inventory" className="inventory-button">
          <span className="inventory-button__icon" aria-hidden="true">🎒</span>
          <b>Inventory</b>
        </Link>
      </div>

      <nav className="bottom-navigation" aria-label="Primary navigation">
        {nav.map(([icon, label, href], index) => (
          <Link key={label} href={href} className={`bottom-navigation__item ${index === 0 ? "is-active" : ""}`}>
            <span className="bottom-navigation__icon" aria-hidden="true">{icon}</span>
            <b>{label}</b>
          </Link>
        ))}
      </nav>

      <style jsx global>{`
        html,
        body {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior-y: auto;
          background: #020817;
        }

        body {
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }

        .home-screen,
        .home-screen * { box-sizing: border-box; }

        .home-screen {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
          background: linear-gradient(180deg, #041733 0%, #020b1d 58%, #010611 100%);
          color: #fff;
          font-family: Arial, Helvetica, sans-serif;
          isolation: isolate;
          -webkit-font-smoothing: antialiased;
        }

        .home-screen a,
        .home-screen span,
        .home-screen b,
        .home-screen strong,
        .home-screen small,
        .home-screen i {
          opacity: 1;
          visibility: visible;
          filter: none;
          text-shadow: none;
        }

        .home-inner {
          position: relative;
          width: min(100%, 760px);
          height: calc(100% - 78px - env(safe-area-inset-bottom, 0px));
          min-height: 0;
          margin: 0 auto;
          padding: calc(8px + env(safe-area-inset-top, 0px)) 14px 2px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .home-header {
          flex: 0 0 68px;
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
        }

        .profile-block {
          min-width: 0;
          height: 68px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #fff;
          text-decoration: none;
        }

        .avatar-ring {
          position: relative;
          flex: 0 0 58px;
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: linear-gradient(145deg, #ffe45c, #ffb300);
          border: 3px solid #ffd43b;
        }

        .avatar-image {
          width: 84%;
          height: 84%;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 50%;
          background: #c58a54;
          border: 2px solid #8b5a32;
          font-size: 31px;
        }

        .level-badge {
          position: absolute;
          left: 50%;
          bottom: -7px;
          transform: translateX(-50%);
          min-width: 31px;
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

        .profile-details { min-width: 0; flex: 1 1 auto; }

        .player-name {
          display: block;
          max-width: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          color: #fff;
          font-size: clamp(19px, 4.4vw, 25px);
          line-height: 1;
          font-weight: 900;
        }

        .xp-track,
        .level-progress {
          display: block;
          width: 100%;
          overflow: hidden;
          border-radius: 999px;
          background: #102746;
        }

        .xp-track { height: 5px; margin-top: 6px; }
        .xp-track > span,
        .level-progress > i {
          display: block;
          height: 100%;
          border-radius: inherit;
        }
        .xp-track > span { background: linear-gradient(90deg, #37c8ff, #7df5ff); }

        .level-line {
          min-width: 0;
          margin-top: 3px;
          display: grid;
          grid-template-columns: auto minmax(24px, 1fr) auto;
          align-items: center;
          gap: 5px;
          color: #ffd21a;
          font-size: 8px;
          line-height: 1;
        }
        .level-line b { color: #ffd21a; white-space: nowrap; font-weight: 950; }
        .level-progress { height: 9px; }
        .level-progress > i { background: linear-gradient(90deg, #ffb51b, #ffe15a); }

        .wallet {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
        }
        .wallet-pill {
          height: 38px;
          padding: 0 8px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          white-space: nowrap;
          border-radius: 12px;
          background: #051737;
          border: 1px solid #173766;
          color: #fff;
          font-size: 11px;
          line-height: 1;
        }
        .plus-button {
          flex: 0 0 46px;
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #39b930;
          border: 2px solid #83ec64;
          color: #fff;
          text-decoration: none;
          font-size: 29px;
          line-height: 1;
          font-weight: 950;
        }

        .main-actions {
          flex: 0 0 auto;
          margin-top: 8px;
          display: grid;
          grid-template-rows: repeat(4, 88px);
          gap: 8px;
        }

        .main-action {
          min-width: 0;
          min-height: 88px;
          display: grid;
          grid-template-columns: 68px minmax(0, 1fr) 24px;
          align-items: center;
          gap: 10px;
          padding: 8px 13px;
          overflow: hidden;
          border-radius: 19px;
          border: 1px solid rgba(255,255,255,.25);
          color: #fff !important;
          text-decoration: none;
          box-shadow: 0 5px 14px rgba(0,0,0,.20);
        }
        .main-action--online { background: linear-gradient(135deg,#159447 0%,#31c936 100%); }
        .main-action--tournament { background: linear-gradient(135deg,#6b1998 0%,#a126c8 100%); }
        .main-action--solo { background: linear-gradient(135deg,#b86b12 0%,#e39a24 100%); }
        .main-action--friends { background: linear-gradient(135deg,#087b61 0%,#16b875 100%); }

        .main-action__icon {
          width: 68px;
          display: grid;
          place-items: center;
          color: #fff !important;
          font-size: 43px !important;
          line-height: 1 !important;
        }
        .main-action__copy { min-width: 0; overflow: hidden; color: #fff !important; }
        .main-action__title {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          color: #fff !important;
          font-size: clamp(16px, 3.2vw, 25px) !important;
          line-height: 1.05 !important;
          font-weight: 950 !important;
        }
        .main-action__sub {
          display: block;
          margin-top: 4px;
          color: #fff !important;
          font-size: clamp(9px, 2vw, 14px) !important;
          line-height: 1.15 !important;
          font-weight: 750 !important;
        }
        .main-action__arrow {
          color: #fff !important;
          font-size: 31px !important;
          line-height: 1 !important;
          text-align: center;
          font-weight: 400 !important;
        }

        .quick-actions {
          flex: 0 0 112px;
          margin-top: 9px;
          padding: 8px 5px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          align-items: center;
          border-radius: 18px;
          background: #06152f;
          border: 1px solid #173766;
        }

        .quick-action {
          min-width: 0;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 5px;
          color: #fff !important;
          text-decoration: none;
          text-align: center;
          font-size: clamp(9px, 2.25vw, 13px);
          line-height: 1.05;
        }
        .quick-action__icon { font-size: clamp(28px, 7vw, 40px) !important; line-height: 1 !important; }
        .quick-action b { color: #fff !important; font-weight: 850 !important; }

        .inventory-button {
          flex: 0 0 76px;
          margin-top: 9px;
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 19px;
          background: #103574;
          border: 1px solid #214d95;
          color: #fff !important;
          text-decoration: none;
          box-shadow: 0 5px 14px rgba(0,0,0,.18);
          font-size: 21px;
          line-height: 1;
        }
        .inventory-button__icon { font-size: 44px !important; line-height: 1 !important; }
        .inventory-button b { color: #fff !important; font-weight: 950 !important; }

        .bottom-navigation {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          height: calc(78px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          background: #020b1b;
          border-top: 1px solid #17325b;
          z-index: 20;
        }
        .bottom-navigation__item {
          min-width: 0;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 4px;
          color: #9eb3d7 !important;
          text-decoration: none;
          font-size: 13px;
          line-height: 1;
          text-align: center;
        }
        .bottom-navigation__item.is-active {
          color: #fff !important;
          background: #16477f;
        }
        .bottom-navigation__icon { font-size: 31px !important; line-height: 1 !important; }
        .bottom-navigation__item b { color: inherit !important; font-weight: 850 !important; }

        /* Keep the layout compact on shorter phones instead of allowing the
           bottom navigation to cover the Inventory button. */
        @media (max-height: 780px) and (max-width: 600px) {
          .home-inner { padding-left: 12px; padding-right: 12px; }
          .home-header { flex-basis: 62px; }
          .profile-block { height: 62px; }
          .avatar-ring { flex-basis: 52px; width: 52px; height: 52px; }
          .wallet-pill { height: 34px; padding-left: 6px; padding-right: 6px; font-size: 10px; }
          .plus-button { flex-basis: 42px; width: 42px; height: 42px; font-size: 26px; }
          .main-actions { margin-top: 6px; grid-template-rows: repeat(4, 72px); gap: 6px; }
          .main-action { min-height: 72px; grid-template-columns: 54px minmax(0,1fr) 20px; gap: 7px; padding: 7px 10px; border-radius: 16px; }
          .main-action__icon { width: 54px; font-size: 34px !important; }
          .main-action__title { font-size: 16px !important; }
          .main-action__sub { margin-top: 3px; font-size: 9px !important; }
          .main-action__arrow { font-size: 27px !important; }
          .quick-actions { flex-basis: 92px; margin-top: 7px; }
          .quick-action__icon { font-size: 28px !important; }
          .inventory-button { flex-basis: 62px; min-height: 62px; margin-top: 0; font-size: 18px; }
          .inventory-button__icon { font-size: 36px !important; }
        }

        /* Extra-tight phones get one final compact step; still no scrolling. */
        @media (max-height: 730px) and (max-width: 600px) {
          .home-header { flex-basis: 58px; }
          .profile-block { height: 58px; }
          .avatar-ring { flex-basis: 48px; width: 48px; height: 48px; }
          .main-actions { grid-template-rows: repeat(4, 68px); gap: 5px; }
          .main-action { min-height: 68px; }
          .quick-actions { flex-basis: 86px; }
          .inventory-button { flex-basis: 58px; min-height: 58px; }
        }
      `}</style>
    </main>
  );
}
