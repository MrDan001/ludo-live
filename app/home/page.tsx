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
  kind: "online" | "tournament" | "solo" | "friends";
};

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
        // Preserve the current wallet display if the network is temporarily unavailable.
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
      <div className="home-screen__content">
        <header className="home-header">
          <Link href="/profile" className="profile-block">
            <div className="avatar-ring">
              <div className="avatar-image"><EquippedAvatar /></div>
              <div className="level-badge">{progress.level}</div>
            </div>

            <div className="profile-details">
              <strong className="player-name">{name}</strong>
              <div className="xp-track" aria-hidden="true">
                <span style={{ width: `${xpPercent}%` }} />
              </div>
              <div className="level-line">
                <b>LEVEL {progress.level}</b>
                <span className="level-track" aria-hidden="true"><i style={{ width: `${xpPercent}%` }} /></span>
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
        .home-screen,
        .home-screen * {
          box-sizing: border-box !important;
        }

        .home-screen {
          position: fixed !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          background: linear-gradient(180deg, #041733 0%, #020b1d 58%, #010611 100%) !important;
          color: #fff !important;
          font-family: Arial, Helvetica, sans-serif !important;
          isolation: isolate !important;
        }

        .home-screen a,
        .home-screen span,
        .home-screen b,
        .home-screen strong,
        .home-screen small,
        .home-screen i {
          opacity: 1 !important;
          filter: none !important;
          visibility: visible !important;
        }

        .home-screen__content {
          width: min(100%, 760px) !important;
          height: calc(100dvh - 78px - env(safe-area-inset-bottom, 0px)) !important;
          min-height: 0 !important;
          margin: 0 auto !important;
          padding: max(8px, env(safe-area-inset-top, 0px)) 14px 12px !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .home-header {
          flex: 0 0 70px !important;
          min-width: 0 !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          align-items: center !important;
          gap: 8px !important;
        }

        .profile-block {
          min-width: 0 !important;
          height: 70px !important;
          display: flex !important;
          align-items: center !important;
          gap: 9px !important;
          text-decoration: none !important;
          color: #fff !important;
        }

        .avatar-ring {
          position: relative !important;
          flex: 0 0 58px !important;
          width: 58px !important;
          height: 58px !important;
          display: grid !important;
          place-items: center !important;
          border-radius: 50% !important;
          background: linear-gradient(145deg, #ffe45c, #ffb300) !important;
          border: 3px solid #ffd43b !important;
        }

        .avatar-image {
          width: 84% !important;
          height: 84% !important;
          display: grid !important;
          place-items: center !important;
          border-radius: 50% !important;
          overflow: hidden !important;
          background: #c58a54 !important;
          border: 2px solid #8b5a32 !important;
          font-size: 31px !important;
        }

        .level-badge {
          position: absolute !important;
          left: 50% !important;
          bottom: -7px !important;
          transform: translateX(-50%) !important;
          min-width: 31px !important;
          height: 21px !important;
          padding: 0 5px !important;
          display: grid !important;
          place-items: center !important;
          border-radius: 7px !important;
          background: #ffd21a !important;
          color: #111 !important;
          border: 2px solid #f5b900 !important;
          font-size: 12px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
        }

        .profile-details {
          min-width: 0 !important;
          flex: 1 1 auto !important;
        }

        .player-name {
          display: block !important;
          max-width: 100% !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
          color: #fff !important;
          font-size: clamp(19px, 4.6vw, 25px) !important;
          line-height: 1 !important;
        }

        .xp-track {
          display: block !important;
          width: 100% !important;
          height: 5px !important;
          margin-top: 6px !important;
          overflow: hidden !important;
          border-radius: 999px !important;
          background: #102746 !important;
        }

        .xp-track > span {
          display: block !important;
          height: 100% !important;
          border-radius: inherit !important;
          background: linear-gradient(90deg, #37c8ff, #7df5ff) !important;
        }

        .level-line {
          min-width: 0 !important;
          margin-top: 3px !important;
          display: grid !important;
          grid-template-columns: auto minmax(24px, 1fr) auto !important;
          align-items: center !important;
          gap: 5px !important;
          color: #ffd21a !important;
          font-size: 8px !important;
          line-height: 1 !important;
        }

        .level-line b {
          color: #ffd21a !important;
          white-space: nowrap !important;
          font-weight: 950 !important;
        }

        .level-track {
          display: block !important;
          width: 100% !important;
          height: 9px !important;
          overflow: hidden !important;
          border-radius: 999px !important;
          background: #102746 !important;
        }

        .level-track i {
          display: block !important;
          height: 100% !important;
          border-radius: inherit !important;
          background: linear-gradient(90deg, #ffb51b, #ffe15a) !important;
        }

        .wallet {
          min-width: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 5px !important;
        }

        .wallet-pill {
          min-width: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 3px !important;
          height: 38px !important;
          padding: 0 8px !important;
          border-radius: 12px !important;
          background: #051737 !important;
          border: 1px solid #173766 !important;
          color: #fff !important;
          font-size: 11px !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }

        .plus-button {
          flex: 0 0 46px !important;
          width: 46px !important;
          height: 46px !important;
          display: grid !important;
          place-items: center !important;
          border-radius: 50% !important;
          background: #39b930 !important;
          border: 2px solid #83ec64 !important;
          color: #fff !important;
          text-decoration: none !important;
          font-size: 29px !important;
          font-weight: 950 !important;
          line-height: 1 !important;
        }

        .main-actions {
          flex: 0 0 auto !important;
          display: grid !important;
          grid-template-rows: repeat(4, clamp(76px, 10.4dvh, 92px)) !important;
          gap: clamp(7px, 0.9dvh, 10px) !important;
          margin-top: 7px !important;
        }

        .main-action {
          position: relative !important;
          min-width: 0 !important;
          min-height: 0 !important;
          display: grid !important;
          grid-template-columns: 72px minmax(0, 1fr) 24px !important;
          align-items: center !important;
          gap: 10px !important;
          padding: 8px 13px !important;
          overflow: hidden !important;
          border-radius: 19px !important;
          border: 1px solid rgba(255,255,255,.25) !important;
          color: #fff !important;
          text-decoration: none !important;
          box-shadow: 0 5px 14px rgba(0,0,0,.20) !important;
        }

        .main-action--online { background: linear-gradient(135deg, #159447 0%, #31c936 100%) !important; }
        .main-action--tournament { background: linear-gradient(135deg, #6b1998 0%, #a126c8 100%) !important; }
        .main-action--solo { background: linear-gradient(135deg, #b86b12 0%, #e39a24 100%) !important; }
        .main-action--friends { background: linear-gradient(135deg, #087b61 0%, #16b875 100%) !important; }

        .main-action__icon {
          min-width: 0 !important;
          width: 72px !important;
          display: grid !important;
          place-items: center !important;
          color: #fff !important;
          font-size: 43px !important;
          line-height: 1 !important;
        }

        .main-action__copy {
          min-width: 0 !important;
          overflow: hidden !important;
          color: #fff !important;
        }

        .main-action__title {
          display: block !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
          color: #fff !important;
          font-size: clamp(17px, 4vw, 24px) !important;
          line-height: 1.04 !important;
          font-weight: 950 !important;
        }

        .main-action__sub {
          display: block !important;
          margin-top: 4px !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
          color: #fff !important;
          font-size: clamp(9px, 2.2vw, 13px) !important;
          line-height: 1.1 !important;
          font-weight: 750 !important;
        }

        .main-action__arrow {
          display: grid !important;
          place-items: center !important;
          color: #fff !important;
          font-size: 31px !important;
          line-height: 1 !important;
          font-weight: 400 !important;
        }

        .quick-actions {
          flex: 0 0 92px !important;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          margin-top: 9px !important;
          padding: 7px 4px !important;
          border-radius: 18px !important;
          background: #061731 !important;
          border: 1px solid #173766 !important;
          overflow: hidden !important;
        }

        .quick-action {
          min-width: 0 !important;
          display: grid !important;
          place-items: center !important;
          align-content: center !important;
          gap: 4px !important;
          color: #fff !important;
          text-decoration: none !important;
          text-align: center !important;
        }

        .quick-action__icon {
          display: block !important;
          color: #fff !important;
          font-size: 35px !important;
          line-height: 1 !important;
        }

        .quick-action b {
          display: block !important;
          max-width: 100% !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
          color: #fff !important;
          font-size: 11px !important;
          line-height: 1.05 !important;
          font-weight: 800 !important;
        }

        .inventory-button {
          flex: 0 0 72px !important;
          min-height: 72px !important;
          margin-top: 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          border-radius: 18px !important;
          background: #0a214b !important;
          border: 1px solid #173766 !important;
          color: #fff !important;
          text-decoration: none !important;
          overflow: hidden !important;
        }

        .inventory-button__icon {
          display: block !important;
          font-size: 43px !important;
          line-height: 1 !important;
        }

        .inventory-button b {
          color: #fff !important;
          font-size: 20px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
        }

        .bottom-navigation {
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 100 !important;
          height: calc(78px + env(safe-area-inset-bottom, 0px)) !important;
          padding-bottom: env(safe-area-inset-bottom, 0px) !important;
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          background: #020b1b !important;
          border-top: 1px solid #17325b !important;
        }

        .bottom-navigation__item {
          min-width: 0 !important;
          display: grid !important;
          place-items: center !important;
          align-content: center !important;
          gap: 2px !important;
          color: #9eb3d7 !important;
          text-decoration: none !important;
          font-size: 11px !important;
          line-height: 1 !important;
        }

        .bottom-navigation__item.is-active {
          background: #123a72 !important;
          color: #fff !important;
        }

        .bottom-navigation__item b {
          color: inherit !important;
          font-size: 11px !important;
          font-weight: 800 !important;
        }

        .bottom-navigation__icon {
          display: block !important;
          color: inherit !important;
          font-size: 29px !important;
          line-height: 1 !important;
        }

        @media (max-width: 430px) {
          .home-screen__content { padding-left: 12px !important; padding-right: 12px !important; }
          .avatar-ring { flex-basis: 54px !important; width: 54px !important; height: 54px !important; }
          .profile-block { gap: 8px !important; }
          .wallet-pill { height: 36px !important; padding: 0 6px !important; font-size: 10px !important; }
          .plus-button { flex-basis: 42px !important; width: 42px !important; height: 42px !important; }
          .main-action { grid-template-columns: 60px minmax(0, 1fr) 20px !important; gap: 8px !important; padding-left: 9px !important; padding-right: 9px !important; }
          .main-action__icon { width: 60px !important; font-size: 38px !important; }
          .main-action__title { font-size: 18px !important; }
          .main-action__sub { font-size: 9px !important; }
          .quick-action__icon { font-size: 31px !important; }
        }

        @media (max-height: 700px) {
          .main-actions { grid-template-rows: repeat(4, 70px) !important; gap: 6px !important; }
          .quick-actions { flex-basis: 82px !important; }
          .inventory-button { flex-basis: 62px !important; min-height: 62px !important; margin-top: 8px !important; }
          .inventory-button__icon { font-size: 37px !important; }
          .inventory-button b { font-size: 18px !important; }
        }
      `}</style>
    </main>
  );
}
