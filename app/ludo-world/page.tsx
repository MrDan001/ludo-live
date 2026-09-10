"use client";

import { useEffect, useState } from "react";
import AppFrame from "../_components/AppFrame";
import EquippedAvatar from "../_components/EquippedAvatar";
import type { WorldMode } from "./engines/types";
import { WORLD_ENGINES } from "./WorldGamePage";
import "./world.css";

type User = { username: string; level: number; xp: number; coins: number; gems: number };
type Customization = { equippedBoard?: string };

const MODE_PATHS: Record<WorldMode, string> = {
  arena: "/ludo-world/arena",
  speed: "/ludo-world/speed",
  teams: "/ludo-world/teams",
  chaos: "/ludo-world/chaos",
  boss: "/ludo-world/boss",
  tournament: "/ludo-world/tournament",
};

const MODES: WorldMode[] = ["arena", "speed", "teams", "chaos", "boss", "tournament"];

export default function LudoWorldPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customization, setCustomization] = useState<Customization>({ equippedBoard: "classic" });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"home" | "modes" | "profile">("home");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const auth = await fetch("/api/auth", { cache: "no-store" }).then(async (r) => (r.ok ? r.json() : null)).catch(() => null);
        const custom = await fetch("/api/customization", { cache: "no-store" }).then(async (r) => (r.ok ? r.json() : null)).catch(() => null);
        if (!alive) return;
        if (auth?.user) {
          setUser({
            username: String(auth.user.username || "Player"),
            level: Math.max(1, Number(auth.user.level) || 1),
            xp: Math.max(0, Number(auth.user.xp) || 0),
            coins: Math.max(0, Number(auth.user.coins) || 0),
            gems: Math.max(0, Number(auth.user.gems) || 0),
          });
        } else setUser(null);
        if (custom?.equippedBoard) setCustomization({ equippedBoard: String(custom.equippedBoard) });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const level = user?.level ?? 1;
  const unlocked = level >= 5;
  const xpToNext = 10 + level * 5;
  const xp = Math.min(xpToNext, user?.xp ?? 0);
  const progress = Math.max(0, Math.min(100, (xp / xpToNext) * 100));

  const openMode = (mode: WorldMode) => {
    if (!unlocked) return;
    window.location.href = MODE_PATHS[mode];
  };

  if (loading) {
    return <AppFrame hideBack><div className="lw-loading"><div className="lw-orb">🌎</div><h1>Entering Ludo World…</h1><p>Loading your player profile.</p></div></AppFrame>;
  }
  if (!user) {
    return <AppFrame hideBack><div className="lw-lock"><div className="lw-lock-icon">🔐</div><h1>Login required</h1><p>Sign in to enter Ludo World.</p><a className="lw-primary" href="/login">Go to Login</a></div></AppFrame>;
  }
  if (!unlocked) {
    return <AppFrame back="/lobby" backLabel="← Back to Online"><div className="lw-locked-world"><div className="lw-lock-art"><span>🌎</span><b>LEVEL {level}</b></div><div className="lw-lock-copy"><div className="lw-kicker">A NEW WORLD IS WAITING</div><h1>Ludo World is locked</h1><p>Reach <strong>Level 5</strong> to unlock six dedicated World game engines with separate boards, rules and progression.</p><div className="lw-progress-label"><span>Level {level}</span><span>Level 5</span></div><div className="lw-progress"><i style={{ width: `${Math.min(100, (level / 5) * 100)}%` }} /></div><div className="lw-teaser-grid">{MODES.slice(0, 4).map((mode) => <div key={mode} className="lw-teaser"><span>{WORLD_ENGINES[mode].tag === "BOSS" ? "👹" : mode === "speed" ? "⚡" : "🎮"}</span><b>{WORLD_ENGINES[mode].title}</b><small>LOCKED</small></div>)}</div><div className="lw-tip">🔥 Keep playing normal Ludo to earn XP and reach Level 5.</div></div></div></AppFrame>;
  }

  const featured = WORLD_ENGINES.arena;

  return <AppFrame back="/lobby" backLabel="← Back to Online">
    <div className="lw-shell">
      <header className="lw-topbar">
        <div className="lw-brand"><div className="lw-brand-orb">🌎</div><div><div className="lw-kicker">LUDO LIVE</div><b>LUDO WORLD</b></div></div>
        <div className="lw-nav"><button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>Home</button><button className={tab === "modes" ? "active" : ""} onClick={() => setTab("modes")}>Game Modes</button><button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>Profile</button></div>
        <div className="lw-wallet"><span>🪙 {user.coins.toLocaleString()}</span><span>💎 {user.gems.toLocaleString()}</span></div>
      </header>

      {tab === "home" && <>
        <section className="lw-hero">
          <div className="lw-hero-copy"><div className="lw-pill">LEVEL {level} • WORLD ACCESS UNLOCKED</div><h1>Welcome to the<br/><span>Ludo World.</span></h1><p>Six different game engines. Six different ways to play. Pick a mode and jump into its own dedicated game page.</p><div className="lw-hero-actions"><button className="lw-primary" onClick={() => openMode("arena")}>⚔️ Play Ranked Arena</button><button className="lw-secondary" onClick={() => setTab("modes")}>🎮 Explore Modes</button></div></div>
          <div className="lw-hero-card"><div className="lw-avatar-ring"><EquippedAvatar style={{ width: 112, height: 112 }} /></div><b>{user.username}</b><span>World Level {level}</span><div className="lw-mini-progress"><i style={{ width: `${progress}%` }} /></div><small>{xp} / {xpToNext} XP to next level</small><div className="lw-stat-row"><div><b>{level}</b><span>LEVEL</span></div><div><b>{user.coins.toLocaleString()}</b><span>COINS</span></div><div><b>{user.gems.toLocaleString()}</b><span>GEMS</span></div></div></div>
        </section>

        <section className="lw-section"><div className="lw-section-head"><div><div className="lw-kicker">PLAY NOW</div><h2>Choose your World</h2></div><button onClick={() => setTab("modes")}>See all →</button></div><div className="lw-mode-grid">{MODES.map((mode) => { const engine = WORLD_ENGINES[mode]; return <button key={mode} className="lw-mode-card" onClick={() => openMode(mode)}><span className="lw-mode-icon">{mode === "arena" ? "⚔️" : mode === "speed" ? "⚡" : mode === "teams" ? "👥" : mode === "chaos" ? "🌪️" : mode === "boss" ? "👹" : "🏟️"}</span><span className="lw-mode-tag">{engine.tag}</span><b>{engine.title}</b><small>{engine.subtitle}</small><em>PLAY NOW →</em></button>; })}</div></section>

        <section className="lw-two-col"><div className="lw-panel"><div className="lw-kicker">FEATURED</div><h2>{featured.title}</h2><p>{featured.subtitle}</p><button className="lw-primary" onClick={() => openMode("arena")}>Enter Featured Mode →</button></div><div className="lw-panel lw-powers"><div className="lw-kicker">WORLD DESIGN</div><h2>Independent engines</h2><div className="lw-power"><span>⚙️</span><div><b>Separate rules</b><small>Each mode owns its own turn behaviour, AI strategy and special mechanics.</small></div></div><div className="lw-power"><span>🧩</span><div><b>Separate game pages</b><small>The World home is a hub; gameplay lives under its own route.</small></div></div><div className="lw-power"><span>🎨</span><div><b>Shared identity</b><small>Your equipped avatar and board theme follow you into every World mode.</small></div></div></div></section>
      </>}

      {tab === "modes" && <section className="lw-section"><div className="lw-section-head"><div><div className="lw-kicker">THE PLAYGROUND</div><h2>All World modes</h2></div><span className="lw-selected">Tap a card to open its dedicated game page.</span></div><div className="lw-mode-grid lw-mode-grid-large">{MODES.map((mode) => { const engine = WORLD_ENGINES[mode]; return <button key={mode} className="lw-mode-card" onClick={() => openMode(mode)}><span className="lw-mode-icon">{mode === "arena" ? "⚔️" : mode === "speed" ? "⚡" : mode === "teams" ? "👥" : mode === "chaos" ? "🌪️" : mode === "boss" ? "👹" : "🏟️"}</span><span className="lw-mode-tag">{engine.tag}</span><b>{engine.title}</b><small>{engine.subtitle}</small><em>OPEN GAME →</em></button>; })}</div></section>}

      {tab === "profile" && <section className="lw-section"><div className="lw-section-head"><div><div className="lw-kicker">PLAYER PROFILE</div><h2>My World Profile</h2></div><span className="lw-selected">{user.username}</span></div><div className="lw-two-col"><div className="lw-panel"><div className="lw-kicker">IDENTITY</div><h2>Equipped avatar</h2><div className="lw-avatar-ring"><EquippedAvatar style={{ width: 96, height: 96 }} /></div><p>Your World games use the same equipped avatar as the rest of Ludo Live.</p></div><div className="lw-panel"><div className="lw-kicker">BOARD THEME</div><h2>{customization.equippedBoard || "classic"}</h2><p>Your selected board theme is carried into each World game engine.</p><button className="lw-primary" onClick={() => openMode("arena")}>Play Arena →</button></div></div></section>}

      <footer className="lw-footer"><span>🌎 Ludo World</span><small>Hub only. Gameplay lives on dedicated mode pages.</small><button onClick={() => openMode("arena")}>Play Arena →</button></footer>
    </div>
  </AppFrame>;
}
