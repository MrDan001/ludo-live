"use client";

import { useEffect, useMemo, useState } from "react";
import AppFrame from "../_components/AppFrame";
import EquippedAvatar from "../_components/EquippedAvatar";
import WorldBoard, { type WorldMode } from "./WorldBoard";
import "./world.css";

type User = { username: string; level: number; xp: number; coins: number; gems: number };
type Customization = { equippedBoard?: string };
type Mode = { id: WorldMode; icon: string; title: string; copy: string; tag: string };

const MODES: Mode[] = [
  { id: "arena", icon: "⚔️", title: "Ranked Arena", copy: "Standard World battle with captures, home lanes and win progression.", tag: "BATTLE" },
  { id: "speed", icon: "⚡", title: "Speed Ludo", copy: "Every human turn has a 10-second clock.", tag: "10s TURNS" },
  { id: "teams", icon: "👥", title: "2v2 Team Battle", copy: "Red and Yellow work together against the World AI team.", tag: "TEAMPLAY" },
  { id: "chaos", icon: "🌪️", title: "Chaos Mode", copy: "Random bonus turns keep the board unpredictable.", tag: "WILD" },
  { id: "boss", icon: "👹", title: "Boss Battle", copy: "A tougher World boss favors advanced moves.", tag: "CO-OP" },
  { id: "tournament", icon: "🏟️", title: "Tournament", copy: "Best-of-three World series. Win two rounds to take the crown.", tag: "3 ROUNDS" },
];

const MODE_RULES: Record<WorldMode, string[]> = {
  arena: ["Classic World movement", "Capture opponents", "Six gives another turn"],
  speed: ["10-second human turn clock", "Timeout automatically skips the turn", "Six still gives another turn"],
  teams: ["You control Red + Yellow", "World AI controls Green + Blue", "Shared team victory condition"],
  chaos: ["Random bonus turns", "Capture rules stay active", "Six still gives another turn"],
  boss: ["Boss AI moves faster", "Boss favors advanced tokens", "Boss still uses the same board rules"],
  tournament: ["Best of three rounds", "First side to two wins", "Series score stays visible between rounds"],
};

export default function LudoWorldPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customization, setCustomization] = useState<Customization>({ equippedBoard: "classic" });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorldMode>("arena");
  const [tab, setTab] = useState<"home" | "modes" | "stats">("home");
  const [showBoard, setShowBoard] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [authRes, customRes] = await Promise.all([
          fetch("/api/auth", { cache: "no-store" }),
          fetch("/api/customization", { cache: "no-store" }),
        ]);
        const auth = await authRes.json();
        const custom = await customRes.json();
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
        setCustomization({ equippedBoard: String(custom?.equippedBoard || "classic") });
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const level = user?.level ?? 1;
  const unlocked = level >= 5;
  const xpToNext = 10 + level * 5;
  const xp = Math.min(xpToNext, user?.xp ?? 0);
  const progress = Math.max(0, Math.min(100, (xp / xpToNext) * 100));
  const selectedMode = useMemo(() => MODES.find((m) => m.id === selected) || MODES[0], [selected]);

  const openMode = (id: WorldMode) => {
    setSelected(id);
    setShowBoard(true);
    setTab("home");
  };

  const notifyCompleted = async () => {
    const eventKey = `world-${selected}-win-${Date.now()}`;
    try {
      const r = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "game_win", eventKey }),
      });
      setToast(r.ok ? "🏆 Win recorded. Progress updated." : "🏆 Match won. Progress update is unavailable right now.");
    } catch {
      setToast("🏆 Match won. Progress update is unavailable right now.");
    }
  };

  if (loading) {
    return <AppFrame><div className="lw-loading"><div className="lw-orb">🌎</div><h1>Entering Ludo World…</h1><p>Loading your player profile.</p></div></AppFrame>;
  }
  if (!user) {
    return <AppFrame><div className="lw-lock"><div className="lw-lock-icon">🔐</div><h1>Login required</h1><p>Sign in to enter Ludo World.</p><a className="lw-primary" href="/login">Go to Login</a></div></AppFrame>;
  }
  if (!unlocked) {
    return <AppFrame><div className="lw-locked-world"><div className="lw-lock-art"><span>🌎</span><b>LEVEL {level}</b></div><div className="lw-lock-copy"><div className="lw-kicker">A NEW WORLD IS WAITING</div><h1>Ludo World is locked</h1><p>Reach <strong>Level 5</strong> to unlock World battles, team games, special rules, tournaments and boss fights.</p><div className="lw-progress-label"><span>Level {level}</span><span>Level 5</span></div><div className="lw-progress"><i style={{ width: `${Math.min(100, (level / 5) * 100)}%` }} /></div><div className="lw-teaser-grid">{MODES.slice(0, 4).map((m) => <div key={m.id} className="lw-teaser"><span>{m.icon}</span><b>{m.title}</b><small>LOCKED</small></div>)}</div><div className="lw-tip">🔥 Keep playing normal Ludo to earn XP and reach Level 5.</div></div></div></AppFrame>;
  }

  return <AppFrame back="/lobby" backLabel="← Back to Online">
    <div className="lw-shell">
      <header className="lw-topbar">
        <div className="lw-brand"><div className="lw-brand-orb">🌎</div><div><div className="lw-kicker">LUDO LIVE</div><b>LUDO WORLD</b></div></div>
        <div className="lw-nav"><button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>Home</button><button className={tab === "modes" ? "active" : ""} onClick={() => setTab("modes")}>Game Modes</button><button className={tab === "stats" ? "active" : ""} onClick={() => setTab("stats")}>My Stats</button></div>
        <div className="lw-wallet"><span>🪙 {user.coins.toLocaleString()}</span><span>💎 {user.gems.toLocaleString()}</span></div>
      </header>

      <section className="lw-hero">
        <div className="lw-hero-copy"><div className="lw-pill">LEVEL {level} • WORLD ACCESS UNLOCKED</div><h1>Welcome to the<br/><span>Ludo World.</span></h1><p>Pick a mode and play it now. Every mode opens the same standalone World board with its own rules.</p><div className="lw-hero-actions"><button className="lw-primary" onClick={() => openMode("arena")}>⚔️ Play Arena</button><button className="lw-secondary" onClick={() => setTab("modes")}>🎮 Choose Mode</button></div></div>
        <div className="lw-hero-card"><div className="lw-avatar-ring"><EquippedAvatar style={{ width: 112, height: 112 }} /></div><b>{user.username}</b><span>World Level {level}</span><div className="lw-mini-progress"><i style={{ width: `${progress}%` }} /></div><small>{xp} / {xpToNext} XP to next level</small><div className="lw-stat-row"><div><b>Live</b><span>PROFILE</span></div><div><b>{user.level}</b><span>LEVEL</span></div><div><b>{user.coins.toLocaleString()}</b><span>COINS</span></div></div></div>
      </section>

      {tab === "home" && <>
        {showBoard && <WorldBoard key={selected} mode={selected} boardTheme={customization.equippedBoard as any} onCompleted={notifyCompleted} />}
        <section className="lw-section"><div className="lw-section-head"><div><div className="lw-kicker">PLAY NOW</div><h2>World modes</h2></div><button onClick={() => setTab("modes")}>See all →</button></div><div className="lw-mode-grid">{MODES.map((m) => <button key={m.id} className={`lw-mode-card ${selected === m.id ? "selected" : ""}`} onClick={() => openMode(m.id)}><span className="lw-mode-icon">{m.icon}</span><span className="lw-mode-tag">{m.tag}</span><b>{m.title}</b><small>{m.copy}</small><em>PLAY NOW →</em></button>)}</div></section>
        <section className="lw-two-col"><div className="lw-panel"><div className="lw-kicker">YOUR WORLD</div><h2>Current mode</h2><div className="lw-power"><span>{selectedMode.icon}</span><div><b>{selectedMode.title}</b><small>{selectedMode.copy}</small></div><i>PLAYING</i></div><div className="lw-power"><span>📈</span><div><b>Level {level}</b><small>{xpToNext - xp} XP until the next World level.</small></div><i>LIVE</i></div></div><div className="lw-panel lw-powers"><div className="lw-kicker">MODE RULES</div><h2>{selectedMode.title}</h2>{MODE_RULES[selected].map((rule) => <div className="lw-power" key={rule}><span>✓</span><div><b>{rule}</b></div></div>)}</div></section>
      </>}

      {tab === "modes" && <section className="lw-section"><div className="lw-section-head"><div><div className="lw-kicker">THE PLAYGROUND</div><h2>Choose your battle</h2></div><span className="lw-selected">{selectedMode.title}</span></div><div className="lw-mode-grid lw-mode-grid-large">{MODES.map((m) => <button key={m.id} className={`lw-mode-card ${selected === m.id ? "selected" : ""}`} onClick={() => { setSelected(m.id); setShowBoard(false); }}><span className="lw-mode-icon">{m.icon}</span><span className="lw-mode-tag">{m.tag}</span><b>{m.title}</b><small>{m.copy}</small><em>{selected === m.id ? "SELECTED ✓" : "SELECT →"}</em></button>)}</div><div className="lw-launch"><div><div className="lw-kicker">READY TO PLAY</div><h2>{selectedMode.icon} {selectedMode.title}</h2><p>{selectedMode.copy}</p></div><button className="lw-primary" onClick={() => openMode(selected)}>🚀 Play {selectedMode.title}</button></div></section>}

      {tab === "stats" && <section className="lw-section"><div className="lw-section-head"><div><div className="lw-kicker">PLAYER PROFILE</div><h2>My World Stats</h2></div><span className="lw-selected">{user.username}</span></div><div className="lw-leaderboard"><div className="lw-rank you"><strong>🌎</strong><span>XP</span><b>World Level {level}</b><small>{xp} / {xpToNext} XP</small><em>YOU</em></div><div className="lw-rank"><strong>🪙</strong><span>WALLET</span><b>{user.coins.toLocaleString()} coins</b><small>{user.gems.toLocaleString()} gems</small></div><div className="lw-rank"><strong>🎮</strong><span>MODE</span><b>{selectedMode.title}</b><small>Ready to play</small></div></div><div className="lw-two-col"><div className="lw-panel"><div className="lw-kicker">IDENTITY</div><h2>Equipped</h2><div className="lw-avatar-ring"><EquippedAvatar style={{ width: 96, height: 96 }} /></div><p>Your World profile uses the same equipped avatar and cosmetics as Ludo Live.</p></div><div className="lw-panel"><div className="lw-kicker">BOARD</div><h2>Selected theme</h2><p>{customization.equippedBoard || "classic"}</p><button className="lw-primary" onClick={() => openMode(selected)}>Play with this setup →</button></div></div></section>}

      <footer className="lw-footer"><span>🌎 Ludo World</span><small>Six playable World modes. Shared identity. Standalone gameplay.</small><button onClick={() => openMode(selected)}>Play {selectedMode.title} →</button></footer>
      {toast && <div className="lw-toast">{toast}</div>}
    </div>
  </AppFrame>;
}
