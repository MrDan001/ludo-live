"use client";

import { useEffect, useMemo, useState } from "react";
import AppFrame from "../_components/AppFrame";
import EquippedAvatar from "../_components/EquippedAvatar";
import WorldBoard from "./WorldBoard";
import "./world.css";

type User = { username: string; level: number; xp: number; coins: number; gems: number };
type Customization = { equippedBoard?: string };
type Mode = { id: string; icon: string; title: string; copy: string; tag: string; locked?: boolean };

const MODES: Mode[] = [
  { id: "arena", icon: "⚔️", title: "Ranked Arena", copy: "Climb leagues, build streaks and earn season trophies.", tag: "COMPETITIVE" },
  { id: "speed", icon: "⚡", title: "Speed Ludo", copy: "Fast turns, tight timers and no time to play safe.", tag: "10s TURNS" },
  { id: "teams", icon: "👥", title: "2v2 Team Battle", copy: "Pair up, protect your partner and outsmart the other team.", tag: "TEAMPLAY" },
  { id: "chaos", icon: "🌪️", title: "Chaos Mode", copy: "Unexpected board events, power squares and wild turns.", tag: "WILD" },
  { id: "boss", icon: "👹", title: "Boss Battle", copy: "Team up against a powerful AI boss with special abilities.", tag: "CO-OP" },
  { id: "tournament", icon: "🏟️", title: "Tournament", copy: "Enter brackets, survive rounds and chase the crown.", tag: "BRACKET" },
];

const POWERS = [
  ["🎯", "Target", "Next capture earns bonus points."],
  ["🛡️", "Shield", "Protect one token from a capture."],
  ["🔄", "Swap", "Switch places with a selected opponent."],
  ["❄️", "Freeze", "Pause an opponent's token for one turn."],
];

export default function LudoWorldPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customization, setCustomization] = useState<Customization>({ equippedBoard: "classic" });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("arena");
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<"home" | "modes" | "leaderboard">("home");
  const [showBoard, setShowBoard] = useState(false);

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
    const id = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const level = user?.level ?? 1;
  const unlocked = level >= 5;
  const xpToNext = 10 + level * 5;
  const xp = Math.min(xpToNext, user?.xp ?? 0);
  const progress = Math.max(0, Math.min(100, (xp / xpToNext) * 100));
  const selectedMode = useMemo(() => MODES.find(m => m.id === selected) || MODES[0], [selected]);

  const chooseMode = (id: string) => {
    setSelected(id);
    setShowBoard(id === "arena");
    setToast(`${MODES.find(m => m.id === id)?.title || "Mode"} selected.`);
  };

  const notifyCompleted = async () => {
    const eventKey = `world-arena-win-${Date.now()}`;
    try {
      const r = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "game_win", eventKey }) });
      if (r.ok) setToast("🏆 Win recorded. XP and progression updated.");
      else setToast("🏆 Match won. Progress service could not be updated right now.");
    } catch {
      setToast("🏆 Match won. Progress service could not be updated right now.");
    }
  };

  if (loading) {
    return <AppFrame><div className="lw-loading"><div className="lw-orb">🌎</div><h1>Entering Ludo World…</h1><p>Loading your player profile.</p></div></AppFrame>;
  }
  if (!user) {
    return <AppFrame><div className="lw-lock"><div className="lw-lock-icon">🔐</div><h1>Login required</h1><p>Sign in to enter Ludo World.</p><a className="lw-primary" href="/login">Go to Login</a></div></AppFrame>;
  }
  if (!unlocked) {
    return <AppFrame><div className="lw-locked-world">
      <div className="lw-lock-art"><span>🌎</span><b>LEVEL {level}</b></div>
      <div className="lw-lock-copy"><div className="lw-kicker">A NEW WORLD IS WAITING</div><h1>Ludo World is locked</h1><p>Reach <strong>Level 5</strong> to unlock ranked battles, team games, special powers, tournaments, boss fights and the Ludo World progression system.</p>
        <div className="lw-progress-label"><span>Level {level}</span><span>Level 5</span></div>
        <div className="lw-progress"><i style={{ width: `${Math.min(100, (level / 5) * 100)}%` }} /></div>
        <div className="lw-teaser-grid">{MODES.slice(0, 4).map(m => <div key={m.id} className="lw-teaser"><span>{m.icon}</span><b>{m.title}</b><small>LOCKED</small></div>)}</div>
        <div className="lw-tip">🔥 Keep playing normal Ludo to earn XP and reach Level 5.</div>
      </div>
    </div></AppFrame>;
  }

  return <AppFrame back="/lobby" backLabel="← Back to Online">
    <div className="lw-shell">
      <header className="lw-topbar">
        <div className="lw-brand"><div className="lw-brand-orb">🌎</div><div><div className="lw-kicker">LUDO LIVE</div><b>LUDO WORLD</b></div></div>
        <div className="lw-nav"><button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>Home</button><button className={tab === "modes" ? "active" : ""} onClick={() => setTab("modes")}>Game Modes</button><button className={tab === "leaderboard" ? "active" : ""} onClick={() => setTab("leaderboard")}>Leaderboard</button></div>
        <div className="lw-wallet"><span>🪙 {user.coins.toLocaleString()}</span><span>💎 {user.gems.toLocaleString()}</span></div>
      </header>

      <section className="lw-hero">
        <div className="lw-hero-copy"><div className="lw-pill">LEVEL {level} • WORLD ACCESS UNLOCKED</div><h1>Welcome to the<br/><span>Ludo World.</span></h1><p>This is where Ludo stops being just a board game. Compete, team up, unlock powers, chase streaks and build your legend.</p><div className="lw-hero-actions"><button className="lw-primary" onClick={() => { setSelected("arena"); setShowBoard(true); setTab("home"); }}>⚔️ Enter Arena</button><button className="lw-secondary" onClick={() => setTab("leaderboard")}>🏆 View Rankings</button></div></div>
        <div className="lw-hero-card"><div className="lw-avatar-ring"><EquippedAvatar style={{ width: 112, height: 112 }} /></div><b>{user.username}</b><span>World Level {level}</span><div className="lw-mini-progress"><i style={{width: `${progress}%`}} /></div><small>{xp} / {xpToNext} XP to next level</small><div className="lw-stat-row"><div><b>Live</b><span>PROFILE</span></div><div><b>{user.level}</b><span>LEVEL</span></div><div><b>{user.coins.toLocaleString()}</b><span>COINS</span></div></div></div>
      </section>

      {tab === "home" && <>
        {showBoard && selected === "arena" && <WorldBoard boardTheme={customization.equippedBoard as any} onCompleted={notifyCompleted} />}
        <section className="lw-section"><div className="lw-section-head"><div><div className="lw-kicker">PLAY YOUR WAY</div><h2>World modes</h2></div><button onClick={() => setTab("modes")}>See all →</button></div><div className="lw-mode-grid">{MODES.map(m => <button key={m.id} className={`lw-mode-card ${selected === m.id ? "selected" : ""}`} onClick={() => chooseMode(m.id)}><span className="lw-mode-icon">{m.icon}</span><span className="lw-mode-tag">{m.tag}</span><b>{m.title}</b><small>{m.copy}</small><em>{selected === m.id && showBoard && m.id === "arena" ? "Open board ↓" : "Enter →"}</em></button>)}</div></section>
        <section className="lw-two-col"><div className="lw-panel"><div className="lw-section-head"><div><div className="lw-kicker">TODAY</div><h2>Daily missions</h2></div><button onClick={() => setToast("Mission center is connected to the existing progression service.")}>View all</button></div>{[["Capture 3 opponents",2,3,"+120 XP"],["Win a ranked game",0,1,"+250 XP"],["Roll three sixes",1,3,"+80 coins"]].map(([name,done,goal,reward])=><div className="lw-mission" key={String(name)}><div className="lw-mission-icon">🎯</div><div className="lw-mission-main"><b>{String(name)}</b><div className="lw-mission-progress"><i style={{width:`${(Number(done)/Number(goal))*100}%`}} /></div><small>{String(done)}/{String(goal)}</small></div><strong>{String(reward)}</strong></div>)}</div><div className="lw-panel lw-powers"><div className="lw-kicker">POWER SYSTEM</div><h2>Special abilities</h2><p>These are World rules; the existing Online room engine is separate.</p>{POWERS.map(([icon,name,desc])=><div className="lw-power" key={name}><span>{icon}</span><div><b>{name}</b><small>{desc}</small></div><i>READY</i></div>)}</div></section>
      </>}

      {tab === "modes" && <section className="lw-section"><div className="lw-section-head"><div><div className="lw-kicker">THE PLAYGROUND</div><h2>Choose your battle</h2></div><span className="lw-selected">Selected: {selectedMode.title}</span></div><div className="lw-mode-grid lw-mode-grid-large">{MODES.map(m=><button key={m.id} className={`lw-mode-card ${selected === m.id ? "selected" : ""}`} onClick={() => chooseMode(m.id)}><span className="lw-mode-icon">{m.icon}</span><span className="lw-mode-tag">{m.tag}</span><b>{m.title}</b><small>{m.copy}</small><em>{selected===m.id && m.id==="arena" ? "Open Arena →" : "Select →"}</em></button>)}</div><div className="lw-launch"><div><div className="lw-kicker">READY?</div><h2>{selectedMode.icon} {selectedMode.title}</h2><p>{selectedMode.copy}</p></div><button className="lw-primary" onClick={() => { if(selectedMode.id==="arena"){setTab("home");setShowBoard(true);} else setToast(`${selectedMode.title} is scaffolded separately and ready for its dedicated engine.`); }}>🚀 {selectedMode.id === "arena" ? "Launch Arena" : "Open Mode"}</button></div></section>}

      {tab === "leaderboard" && <section className="lw-section"><div className="lw-section-head"><div><div className="lw-kicker">SEASON 01</div><h2>World leaderboard</h2></div><span className="lw-selected">Your rating is tracked separately from the existing rooms.</span></div><div className="lw-leaderboard">{[["1","NovaKing","2,940","👑"],["2","DiceWiz","2,710","🔥"],["3","QueenMove","2,540","⚡"],["4","{YOU}","1,280","🌎"],["5","LuckySix","1,245","🎯"]].map(row=><div className={`lw-rank ${row[1]==="{YOU}"?"you":""}`} key={row[0]}><strong>#{row[0]}</strong><span>{row[3]}</span><b>{row[1]==="{YOU}"?user.username:row[1]}</b><small>{row[2]} rating</small><em>{row[1]==="{YOU}"?"YOU":""}</em></div>)}</div></section>}

      <footer className="lw-footer"><span>🌎 Ludo World</span><small>Shared identity and cosmetics; standalone World gameplay.</small><button onClick={() => setToast("Arena is playable now. Team, Speed, Chaos and Boss engines can grow independently without touching Online rooms.")}>What’s next? →</button></footer>
      {toast && <div className="lw-toast">✨ {toast}</div>}
    </div>
  </AppFrame>;
}
