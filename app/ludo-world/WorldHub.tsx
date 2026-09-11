"use client";

import { useEffect, useMemo, useState } from "react";
import EquippedAvatar from "../_components/EquippedAvatar";
import { WORLD_MODES } from "./world-data";
import type { BoardThemeId } from "../_components/LudoBoard";
import "./world.css";

type User = { username:string; level:number; xp:number; coins:number; gems:number; equippedBoard?:string };

export default function WorldHub() {
  const [user,setUser]=useState<User|null>(null);
  const [board,setBoard]=useState<BoardThemeId>("classic");
  const [loading,setLoading]=useState(true);

  useEffect(function(){
    let active=true;
    Promise.all([
      fetch("/api/auth",{cache:"no-store"}).catch(function(){return null;}),
      fetch("/api/customization",{cache:"no-store"}).catch(function(){return null;})
    ]).then(async function(res){
      const auth=res[0] && res[0].ok ? await res[0].json().catch(function(){return null;}) : null;
      const custom=res[1] && res[1].ok ? await res[1].json().catch(function(){return null;}) : null;
      if(!active)return;
      if(auth && auth.user)setUser({
        username:String(auth.user.username||"Player"),
        level:Math.max(1,Number(auth.user.level)||1),
        xp:Math.max(0,Number(auth.user.xp)||0),
        coins:Math.max(0,Number(auth.user.coins)||0),
        gems:Math.max(0,Number(auth.user.gems)||0),
        equippedBoard:String(auth.user.equippedBoard||"")
      });
      setBoard(String((custom&&custom.equippedBoard)||(auth&&auth.user&&auth.user.equippedBoard)||"classic") as BoardThemeId);
    }).finally(function(){if(active)setLoading(false);});
    return function(){active=false;};
  },[]);

  const unlocked=!!user && user.level>=5;
  const featured=useMemo(function(){return WORLD_MODES.slice(0,3);},[]);
  const otherWorlds=useMemo(function(){return WORLD_MODES.slice(3);},[]);

  if(loading)return <main className="world-shell world-center"><div className="world-loading-mark">🌎</div><h1>Entering Ludo World</h1><p>Preparing your World.</p></main>;

  if(!user)return <main className="world-shell world-center"><div className="world-loading-mark">🔐</div><h1>Login required</h1><p>Sign in to enter Ludo World.</p><a className="world-primary" href="/login">Go to Login</a></main>;

  function enter(id:string){if(unlocked)window.location.href="/ludo-world/"+id;}

  return <main className="world-shell world-hub">
    <header className="world-hub-top">
      <a href="/lobby" className="world-back">← Ludo Live</a>
      <div className="world-brand"><span>🌎</span><div><small>LUDO LIVE</small><strong>Ludo World</strong></div></div>
      <div className="world-live"><i/> LIVE</div>
    </header>

    <section className="world-hero">
      <div>
        <div className="world-kicker">WELCOME TO YOUR WORLDS</div>
        <h1>Choose your <span>world.</span></h1>
        <p>Every world has its own rules, pace and challenge. Pick a realm, roll the dice and build your World journey.</p>
      </div>
      <div className="world-profile">
        <div className="world-avatar"><EquippedAvatar style={{width:"100%",height:"100%"}}/></div>
        <div><small>PLAYER</small><strong>{user.username}</strong><span>LEVEL {user.level}</span></div>
        <div className="world-wallet"><b>🪙 {user.coins.toLocaleString()}</b><b>💎 {user.gems.toLocaleString()}</b></div>
      </div>
    </section>

    <section className="world-unlock">
      <div><b>{unlocked?"WORLD ACCESS ACTIVE":"WORLD ACCESS"}</b><span>{unlocked?"All six worlds are open. Your next battle starts here.":"Reach Level 5 to unlock the complete World map."}</span></div>
      <div className="world-progress"><span style={{width:(Math.min(100,unlocked?100:user.level*20))+"%"}}/></div>
      <strong>{unlocked?"6/6 WORLDS":"LEVEL "+Math.min(5,user.level)+"/5"}</strong>
    </section>

    <section className="world-section-head">
      <div><small>WORLD MAP</small><h2>Featured worlds</h2></div>
      <span>3 featured</span>
    </section>

    <section className="world-mode-grid">
      {featured.map(function(mode){
        return <button key={mode.id} className="world-mode-card featured" style={{"--mode-accent":mode.accent} as React.CSSProperties} disabled={!unlocked} onClick={function(){enter(mode.id);}}>
          <div className="world-mode-icon">{mode.icon}</div>
          <div className="world-mode-copy"><small>{mode.eyebrow}</small><strong>{mode.title}</strong><span>{mode.subtitle}</span></div>
          <div className="world-mode-arrow">→</div>
        </button>;
      })}
    </section>

    <section className="world-section-head">
      <div><small>EXPLORE MORE</small><h2>Other worlds</h2></div>
      <span>3 more realms</span>
    </section>

    <section className="world-mode-grid">
      {otherWorlds.map(function(mode){
        return <button key={mode.id} className="world-mode-card" style={{"--mode-accent":mode.accent} as React.CSSProperties} disabled={!unlocked} onClick={function(){enter(mode.id);}}>
          <div className="world-mode-icon">{mode.icon}</div>
          <div className="world-mode-copy"><small>{mode.eyebrow}</small><strong>{mode.title}</strong><span>{mode.subtitle}</span></div>
          <div className="world-mode-arrow">→</div>
        </button>;
      })}
    </section>

    <section className="world-identity">
      <div><small>YOUR WORLD BOARD</small><b>{board}</b></div>
      <span>Your equipped board skin carries into every World match.</span>
    </section>
  </main>;
}
