"use client";

import { useEffect, useState } from "react";
import AppFrame from "../_components/AppFrame";
import EquippedAvatar from "../_components/EquippedAvatar";
import { WORLD_ENGINES } from "./engines";
import type { WorldMode } from "./engines/types";
import "./world.css";
import "./world-hub-v2.css";

type User = { username: string; level: number; xp: number; coins: number; gems: number };
const MODES: WorldMode[] = ["arena", "speed", "teams", "chaos", "boss", "tournament"];
const ICONS: Record<WorldMode, string> = { arena: "⚔️", speed: "⚡", teams: "👥", chaos: "🌪️", boss: "👹", tournament: "🏆" };

export default function LudoWorldHubV2() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"games" | "profile">("games");

  useEffect(() => {
    let alive = true;
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((auth) => {
        if (!alive) return;
        if (auth?.user) setUser({ username: String(auth.user.username || "Player"), level: Math.max(1, Number(auth.user.level) || 1), xp: Math.max(0, Number(auth.user.xp) || 0), coins: Math.max(0, Number(auth.user.coins) || 0), gems: Math.max(0, Number(auth.user.gems) || 0) });
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const unlocked = (user?.level ?? 1) >= 5;
  const openMode = (mode: WorldMode) => { if (unlocked) window.location.href = `/ludo-world/${mode}`; };

  if (loading) return <AppFrame hideBack><div className="lwh2-loading"><div>🌎</div><h1>Entering Ludo World</h1><p>Loading your player.</p></div></AppFrame>;
  if (!user) return <AppFrame hideBack><div className="lwh2-loading"><div>🔐</div><h1>Login required</h1><p>Sign in to enter Ludo World.</p><a className="lw-primary" href="/login">Go to Login</a></div></AppFrame>;
  if (!unlocked) return <AppFrame back="/lobby" backLabel="← Back to Online"><div className="lwh2-locked"><div className="lwh2-locked-art">🌎</div><small>WORLD ACCESS</small><h1>Unlock Ludo World</h1><p>Reach Level 5 to enter the World playground and unlock all six dedicated game engines.</p><div className="lwh2-progress"><i style={{ width: `${Math.min(100, (user.level / 5) * 100)}%` }} /></div><div className="lwh2-level"><span>Level {user.level}</span><b>Level 5</b></div><a className="lw-primary" href="/lobby">Play Online Ludo →</a></div></AppFrame>;

  return <AppFrame back="/lobby" backLabel="← Back to Online"><div className="lwh2-shell">
    <header className="lwh2-header"><div className="lwh2-brand"><span>🌎</span><div><small>LUDO LIVE</small><b>LUDO WORLD</b></div></div><div className="lwh2-user"><EquippedAvatar style={{ width: 38, height: 38 }} /><div><b>{user.username}</b><small>LEVEL {user.level}</small></div></div></header>
    <nav className="lwh2-tabs"><button className={tab === "games" ? "active" : ""} onClick={() => setTab("games")}>🎮 Games</button><button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>👤 Profile</button></nav>

    {tab === "games" && <>
      <section className="lwh2-feature"><div><small>FEATURED</small><h1>Ranked Arena</h1><p>Classic World Ludo with captures, six extra-turns and your own World ranking.</p><button onClick={() => openMode("arena")}>⚔️ ENTER ARENA</button></div><div className="lwh2-feature-avatar"><EquippedAvatar style={{ width: 104, height: 104 }} /><b>WORLD LEVEL {user.level}</b><span>{user.coins.toLocaleString()} 🪙</span></div></section>
      <section className="lwh2-section"><div className="lwh2-section-head"><div><small>ALL MODES</small><h2>Choose your game</h2></div><span>6 ENGINES</span></div><div className="lwh2-grid">{MODES.map((mode) => { const e = WORLD_ENGINES[mode]; return <button key={mode} className={`lwh2-mode ${mode === "arena" ? "featured" : ""}`} onClick={() => openMode(mode)}><span className="lwh2-icon">{ICONS[mode]}</span><div><small>{e.tag}</small><b>{e.title}</b><p>{e.subtitle}</p></div><strong>PLAY →</strong></button>; })}</div></section>
      <section className="lwh2-strip"><div><small>WORLD PROGRESSION</small><b>Every mode lives on its own board and ruleset.</b><span>Same player identity · Same equipped cosmetics · Separate game engine</span></div><div className="lwh2-stats"><div><b>{user.level}</b><small>LEVEL</small></div><div><b>{user.coins.toLocaleString()}</b><small>COINS</small></div><div><b>{user.gems.toLocaleString()}</b><small>GEMS</small></div></div></section>
    </>}

    {tab === "profile" && <section className="lwh2-profile"><div className="lwh2-profile-card"><div className="lwh2-big-avatar"><EquippedAvatar style={{ width: 120, height: 120 }} /></div><small>PLAYER</small><h1>{user.username}</h1><span>World Level {user.level}</span><div className="lwh2-profile-stats"><div><b>{user.level}</b><small>LEVEL</small></div><div><b>{user.coins.toLocaleString()}</b><small>COINS</small></div><div><b>{user.gems.toLocaleString()}</b><small>GEMS</small></div></div></div><button className="lwh2-profile-play" onClick={() => openMode("arena")}>⚔️ Play Ranked Arena</button></section>}
  </div></AppFrame>;
}
