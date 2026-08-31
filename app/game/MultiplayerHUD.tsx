"use client";

import { useState } from "react";
import ChatVoice from "./../_components/ChatVoice";

type Player = { playerId: string; name: string; seat: number; host?: boolean; ready?: boolean; connected?: boolean; level?: number; avatar?: string };

type Props = { players: Player[]; me: string; roomCode: string; notice: string; myTurn: boolean; chatOpen: boolean; setChatOpen: (v: boolean) => void; messages: { id: string; name: string; text: string; at: number }[]; chatText: string; setChatText: (v: string) => void; sendChat: () => void };

const fallbackAvatars = ["🦁", "🐯", "🐼", "🦊"];

export default function MultiplayerHUD({ players, me, roomCode, notice, myTurn, chatOpen, setChatOpen, messages, chatText, setChatText, sendChat }: Props) {
  const [muted, setMuted] = useState(false);
  return <>
    <div className="mp-hud">
      <div className="mp-topbar">
        <div className="match-info"><span className="live-dot" /> LIVE MATCH <small>{roomCode ? `ROOM ${roomCode}` : "ONLINE"}</small></div>
        <div className="hud-actions">
          <button className="hud-btn" onClick={() => setChatOpen(!chatOpen)} aria-label="Chat">💬<em>{messages.length || ""}</em></button>
          <button className={`hud-btn ${muted ? "off" : ""}`} onClick={() => setMuted(!muted)} aria-label="Microphone">{muted ? "🔇" : "🎙️"}</button>
        </div>
      </div>

      <div className="player-row">
        {players.slice(0, 4).map((p, index) => {
          const active = String(p.playerId) === String(me);
          const level = Number(p.level) > 0 ? Number(p.level) : 1;
          return <div className={`player-card ${active ? "self" : ""} ${String(p.playerId) === String(me) && myTurn ? "turn" : ""}`} key={p.playerId}>
            <div className="avatar">{p.avatar || fallbackAvatars[index % fallbackAvatars.length]}<span className={p.connected === false ? "offline" : "online"} /></div>
            <div className="player-meta"><strong>{p.name || "Player"}{active ? " (You)" : ""}</strong><span>LEVEL {level}</span></div>
            {p.host && <b className="host">HOST</b>}
          </div>;
        })}
      </div>

      <div className={`turn-status ${myTurn ? "my-turn" : ""}`}><span>{myTurn ? "YOUR TURN" : "MATCH STATUS"}</span><b>{notice}</b></div>

      <div className="hud-bottom"><div className="control-hint">🎲 <span>{myTurn ? "Roll the dice to play" : "Waiting for opponent"}</span></div><div className="hud-more"><button aria-label="Game settings">⚙️</button><button aria-label="Game menu">⋮</button></div></div>
    </div>

    {chatOpen && <section className="mp-chat"><header><div><strong>Match Chat</strong><small>{players.length} players</small></div><button onClick={() => setChatOpen(false)}>×</button></header><div className="chat-scroll">{messages.length === 0 ? <p className="chat-empty">No messages yet.<br/>Say hello to the room.</p> : messages.map((m, i) => <div className={`chat-message ${String(m.id) === String(me) ? "mine" : ""}`} key={`${m.id}-${m.at}-${i}`}><b>{m.name}</b><span>{m.text}</span></div>)}</div><form onSubmit={(e) => { e.preventDefault(); sendChat(); }}><input value={chatText} onChange={e => setChatText(e.target.value.slice(0,240))} placeholder="Type a message…" /><button disabled={!chatText.trim()}>Send</button></form></section>}

    <style jsx global>{`
      .mp-hud{position:fixed;inset:0;z-index:20;pointer-events:none;color:#fff;font-family:system-ui,-apple-system,sans-serif}.mp-topbar,.player-row,.turn-status,.hud-bottom{position:absolute;pointer-events:auto}.mp-topbar{top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(94vw,980px);display:flex;justify-content:space-between;align-items:center}.match-info{padding:8px 12px;border:1px solid #ffffff18;border-radius:14px;background:#080808bb;backdrop-filter:blur(12px);font-size:10px;font-weight:900;letter-spacing:1px}.match-info small{margin-left:8px;color:#aaa;font-weight:700}.live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#4be58b;box-shadow:0 0 10px #4be58b;margin-right:6px}.hud-actions{display:flex;gap:7px}.hud-btn,.hud-more button{position:relative;border:1px solid #ffffff18;background:#080808bb;color:#fff;border-radius:13px;width:42px;height:38px;font-size:17px;backdrop-filter:blur(12px)}.hud-btn em{position:absolute;right:-3px;top:-4px;min-width:14px;height:14px;padding:2px 4px;border-radius:9px;background:#d7aa38;color:#120e05;font-size:8px;font-style:normal}.hud-btn.off{opacity:.65}.player-row{top:max(58px,calc(env(safe-area-inset-top) + 58px));left:50%;transform:translateX(-50%);width:min(94vw,980px);display:flex;justify-content:center;gap:8px}.player-card{display:flex;align-items:center;gap:8px;min-width:132px;padding:7px 10px;border:1px solid #ffffff15;border-radius:15px;background:#080808b8;backdrop-filter:blur(12px);box-shadow:0 8px 22px #0005}.player-card.self{border-color:#d6ab4548}.player-card.turn{box-shadow:0 0 0 1px #e7c35c55,0 8px 25px #0007}.avatar{position:relative;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#24211a;font-size:18px;border:1px solid #ffffff18}.avatar span{position:absolute;right:-1px;bottom:-1px;width:8px;height:8px;border-radius:50%;background:#3cdb83;border:2px solid #090909}.avatar span.offline{background:#777}.player-meta{display:flex;flex-direction:column;min-width:0}.player-meta strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px}.player-meta span{font-size:8px;color:#c9a94f;font-weight:900;letter-spacing:.7px;margin-top:2px}.host{font-size:7px;color:#c9a94f;margin-left:auto}.turn-status{left:50%;bottom:max(48px,calc(env(safe-area-inset-bottom) + 48px));transform:translateX(-50%);display:flex;align-items:center;gap:9px;padding:7px 13px;border-radius:999px;border:1px solid #ffffff16;background:#080808cc;backdrop-filter:blur(12px);white-space:nowrap}.turn-status span{font-size:8px;color:#b8b8b8;font-weight:900;letter-spacing:.6px}.turn-status b{font-size:9px;color:#ead37f}.turn-status.my-turn{border-color:#d7ae4c55}.hud-bottom{bottom:max(10px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(94vw,980px);display:flex;justify-content:space-between;align-items:center}.control-hint{padding:7px 10px;border-radius:12px;background:#080808aa;border:1px solid #ffffff12;font-size:9px;color:#c7c7c7;backdrop-filter:blur(10px)}.control-hint span{margin-left:5px}.hud-more{display:flex;gap:6px}.hud-more button{width:36px;height:34px;font-size:15px}.mp-chat{position:fixed;z-index:40;right:max(12px,env(safe-area-inset-right));top:92px;width:min(330px,calc(100vw - 24px));height:min(430px,58vh);display:flex;flex-direction:column;border:1px solid #d3ad5138;border-radius:18px;background:#0a0908ed;box-shadow:0 20px 60px #000b;backdrop-filter:blur(18px);color:#fff;overflow:hidden}.mp-chat header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #ffffff12}.mp-chat header div{display:flex;flex-direction:column}.mp-chat header strong{font-size:12px}.mp-chat header small{font-size:8px;color:#999;margin-top:2px}.mp-chat header button{border:0;background:transparent;color:#aaa;font-size:22px}.chat-scroll{flex:1;overflow:auto;padding:10px}.chat-empty{text-align:center;color:#777;font-size:10px;margin-top:80px}.chat-message{display:flex;flex-direction:column;align-items:flex-start;margin:7px 0}.chat-message.mine{align-items:flex-end}.chat-message b{font-size:8px;color:#caaa59;margin-bottom:3px}.chat-message span{max-width:82%;padding:7px 9px;border-radius:11px;background:#1a1815;font-size:10px}.chat-message.mine span{background:#70551d}.mp-chat form{display:flex;gap:6px;padding:9px;border-top:1px solid #ffffff12}.mp-chat input{flex:1;min-width:0;border:1px solid #ffffff12;border-radius:10px;background:#151412;color:#fff;padding:8px;font-size:10px;outline:0}.mp-chat form button{border:0;border-radius:10px;background:#d0a83e;color:#171108;padding:0 11px;font-size:9px;font-weight:900}.mp-chat form button:disabled{opacity:.35}
      @media(max-width:700px){.player-row{top:60px;gap:5px;width:96vw}.player-card{min-width:0;flex:1;padding:6px 7px}.player-meta strong{max-width:70px}.player-card:nth-child(n+3){display:none}.turn-status{bottom:54px}.control-hint{display:none}.hud-more{margin-left:auto}.mp-chat{top:104px;height:min(52vh,390px)}}
      @media(orientation:landscape) and (max-height:520px){.mp-topbar{top:6px}.player-row{top:48px}.player-card{padding:4px 7px}.avatar{width:28px;height:28px}.turn-status{bottom:38px}.hud-bottom{bottom:5px}.mp-chat{top:48px;height:70vh}}
    `}</style>
  </>
}
