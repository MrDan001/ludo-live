"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import ChatVoice from "./ChatVoice";
import PlayerIdentityLink from "./PlayerIdentityLink";
import AvatarRenderer from "./AvatarRenderer";
import { AVATAR_ICONS } from "./EquippedAvatar";

type Member = { id: string; playerId?: string; name: string; host?: boolean; ready?: boolean; board?: string; dice?: string; connected?: boolean; avatar?: string };
type Msg = { id: string; name: string; text: string; at: number; type?: string };
type AvatarProfile = { username: string; equipped: { avatar: string } };
type BetState = { enabled: boolean; stake: number; minStake: number; maxStake: number; pot: number; roomSize: number; locked: boolean; status: string; agreed?: boolean; stakedPlayers?: number; allStaked?: boolean };

const QUICK = ["👋 Hi!", "😂 LOL", "🔥 Nice!", "😮 Wow!", "👏 Good move", "🎉 GG", "❤️", "😎"];

const avatarVisual = (id?: string, imageUrl?: string | null) => {
  const safeId = String(id || "default");
  return <AvatarRenderer avatar={{ id: safeId, icon: AVATAR_ICONS[safeId] || "🧑🏽‍🎮", imageUrl: imageUrl || null }} size={52} border="3px solid #d7b94a" background="#0b2a62" fallback={AVATAR_ICONS[safeId] || "🧑🏽‍🎮"} />;
};

const ROOM_CSS = `
.live-social{width:100%;color:#fff}.room-hero{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:0 4px 8px}.room-hero small{display:block;color:#64748b;font-size:10px;letter-spacing:1px}.room-hero strong{display:block;font-size:clamp(24px,7vw,34px);letter-spacing:4px}.room-copy{border:1px solid #334155;background:#0f172a;color:#fff;border-radius:12px;padding:8px 10px;font-weight:800;cursor:pointer}.room-stage{margin-top:0;padding:10px;border-radius:18px;background:#030817;border:1px solid rgba(148,163,184,.16)}.room-stage-head{display:flex;justify-content:space-between;align-items:center;padding:0 4px 7px;font-size:16px}.room-stage-head span{color:#94a3b8}.room-player-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.room-player-card,.room-empty{min-height:112px;padding:8px;border-radius:14px;border:1px solid rgba(59,130,246,.18);background:linear-gradient(160deg,#081a42,#071127);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative}.room-player-card.is-host{border-color:rgba(250,204,21,.4)}.room-avatar-wrap{position:relative;margin-bottom:3px;width:58px;height:58px;display:block}.room-avatar{width:52px;height:52px;box-sizing:border-box;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#0b2a62;border:3px solid #d7b94a;font-size:28px;overflow:hidden;isolation:isolate}.room-avatar img{display:block;width:100%;height:100%;min-width:0;min-height:0;object-fit:contain;object-position:center center}.room-crown{position:absolute;left:-2px;top:-9px;font-size:22px;z-index:2}.room-player-card strong{font-size:14px;color:#f8fafc;max-width:100%;overflow:hidden;text-overflow:ellipsis}.room-status{margin-top:2px;font-weight:900;font-size:11px}.room-status.ready{color:#4ade80}.room-status.not-ready{color:#f87171}.room-kick{margin-top:3px;border:0;border-radius:7px;padding:3px 6px;background:#7f1d1d;color:#fff;font-size:10px;font-weight:900}.room-empty{cursor:pointer;color:#64748b;border-style:dashed}.room-empty span{font-size:34px;line-height:1;color:#60a5fa}.room-empty small{margin-top:3px;font-size:10px}.room-game-meta{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid rgba(148,163,184,.12);margin-top:8px;padding-top:8px}.room-game-meta div{padding:0 8px}.room-game-meta div+div{border-left:1px solid rgba(148,163,184,.12)}.room-game-meta small{display:block;color:#94a3b8;font-size:9px}.room-game-meta strong{display:block;margin-top:4px;color:#f8fafc;font-size:15px}.room-bet-panel{margin-top:8px;padding:9px;border-radius:14px;background:linear-gradient(135deg,rgba(14,30,65,.95),rgba(8,18,38,.95));border:1px solid rgba(250,204,21,.18)}.room-bet-title{display:flex;justify-content:space-between;gap:10px;align-items:center}.room-bet-title b{font-size:13px}.room-bet-title span{color:#94a3b8;font-size:10px}.room-bet-row{display:flex;gap:6px;align-items:center}.room-bet-input{flex:1;min-width:0;border:1px solid #334155;background:#0f172a;color:#fff;border-radius:10px;padding:8px;font-weight:800}.room-bet-button{border:0;border-radius:10px;background:#eab308;color:#17100a;padding:9px 10px;font-size:12px;font-weight:950;cursor:pointer;touch-action:manipulation;pointer-events:auto}.room-bet-button.secondary{background:#2563eb;color:#fff}.room-bet-button:disabled{opacity:.45;cursor:not-allowed}.room-stake-progress{margin-top:5px;color:#facc15;font-size:10px;font-weight:900}.room-controls{display:grid;grid-template-columns:auto auto 1fr auto;gap:6px;align-items:center;margin-top:8px}.room-controls>button,.room-controls>div button{min-height:42px}.room-ready,.room-start,.room-chat-jump{border:0;border-radius:12px;padding:8px 9px;font-size:12px;font-weight:900;cursor:pointer;touch-action:manipulation}.room-ready{background:#2563eb;color:#fff}.room-ready.is-ready{background:#16a34a}.room-start{background:#16a34a;color:#fff}.room-chat-jump{background:#0f172a;color:#fff;border:1px solid #334155;font-size:20px}.room-voice{min-height:42px}.live-social-notice{display:block;margin-top:8px}.room-chat-drawer{position:fixed;inset:0;z-index:1000;background:rgba(2,6,23,.72);display:flex;align-items:flex-end;justify-content:center;padding:12px}.room-chat-sheet{width:min(760px,100%);max-height:78vh;border:1px solid rgba(96,165,250,.28);border-radius:22px 22px 14px 14px;background:#071127;padding:16px;display:flex;flex-direction:column}.room-chat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.room-chat-close{border:1px solid #334155;background:#0f172a;color:#fff;border-radius:10px;padding:7px 11px;font-weight:900}.room-chat-messages{min-height:140px;max-height:42vh;overflow:auto;padding:10px 2px}.room-chat-empty{display:block;color:#94a3b8;padding:30px 0}.room-chat-message{padding:7px 0;color:#e2e8f0}.room-chat-quick{display:flex;gap:7px;flex-wrap:wrap;padding:8px 0}.room-chat-quick button{border:1px solid #334155;background:#0f172a;color:#e2e8f0;border-radius:14px;padding:7px 10px}.room-chat-composer{display:flex;gap:8px}.room-chat-input{flex:1;border:1px solid #334155;background:#111b30;color:#fff;border-radius:12px;padding:12px}.room-chat-send{border:0;border-radius:12px;background:#16a34a;color:#fff;font-weight:900;padding:0 16px}
@media(max-width:380px){.room-player-card,.room-empty{min-height:98px}.room-avatar-wrap{width:50px;height:50px}.room-avatar{width:46px;height:46px;font-size:24px}.room-controls{grid-template-columns:1fr 1fr auto}.room-controls .room-start{grid-column:1/-1}.room-bet-row{flex-direction:row}}
`;

export default function LiveSocial({ roomCode, name, host = false, roomSize = 4, stake = 0, compact = false, onStart, onKicked, leaveRequested = false, onLeaveComplete }: { roomCode: string; name: string; host?: boolean; roomSize?: number; stake?: number; compact?: boolean; onStart?: () => void; onKicked?: () => void; leaveRequested?: boolean; onLeaveComplete?: () => void }) {
  const socketRef = useRef<Socket | null>(null);
  const startRef = useRef(onStart);
  const kickRef = useRef(onKicked);
  const leaveRef = useRef(onLeaveComplete);
  const startTimerRef = useRef<number | null>(null);
  startRef.current = onStart; kickRef.current = onKicked; leaveRef.current = onLeaveComplete;

  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [selfId, setSelfId] = useState("");
  const [selfPlayerId, setSelfPlayerId] = useState("");
  const [profiles, setProfiles] = useState<Record<string, AvatarProfile>>({});
  const [avatarImages, setAvatarImages] = useState<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [stakeInput, setStakeInput] = useState("500");
  const [bet, setBet] = useState<BetState>({ enabled: true, stake: Number(stake) || 0, minStake: 500, maxStake: 10000, pot: (Number(stake) || 0) * roomSize, roomSize, locked: false, status: "open", agreed: Number(stake) > 0, stakedPlayers: 0, allStaked: false });

  const enrichProfiles = (list: Member[]) => {
    const names = [...new Set(list.map(m => m.name).filter(Boolean))];
    Promise.all(names.map(async username => { try { const r = await fetch(`/api/player/${encodeURIComponent(username)}`, { cache: "no-store" }); if (!r.ok) return null; const d = await r.json(); return [username, { username, equipped: d.player?.equipped || { avatar: "default" } }] as const; } catch { return null; } })).then(rows => {
      const resolved = rows.filter(Boolean) as [string, AvatarProfile][];
      if (!resolved.length) return;
      setProfiles(prev => { const next = { ...prev }; for (const row of resolved) next[row[0]] = row[1]; return next; });
      setMembers(prev => prev.map(m => { const profile = resolved.find(x => x[0] === m.name)?.[1]; return profile ? { ...m, avatar: profile.equipped.avatar || m.avatar } : m; }));
    }).catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    const connect = async () => {
      let playerId = "", board = "classic", dice = "classic";
      try { const a = await fetch("/api/auth", { cache: "no-store" }).then(r => r.json()); playerId = String(a.user?.id || ""); board = a.user?.equippedBoard || "classic"; dice = a.user?.equippedDice || "classic"; } catch {}
      setSelfPlayerId(playerId);
      try { const c = await fetch("/api/customization", { cache: "no-store" }).then(r => r.json()); board = c.equippedBoard || board; dice = c.equippedDice || dice; } catch {}
      try { const c = await fetch("/api/shop/catalog", { cache: "no-store" }).then(r => r.json()); const items = Array.isArray(c?.items) ? c.items : []; const map: Record<string,string> = {}; for (const item of items) if (item?.type === "avatar" && item?.id && item?.imageUrl) map[String(item.id)] = String(item.imageUrl); if (!cancelled) setAvatarImages(map); } catch {}
      if (cancelled) return;
      const socket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true });
      socketRef.current = socket;
      socket.on("connect", () => { setSelfId(socket.id || ""); socket.emit("join-room", { roomCode, name, roomSize, playerId, board, dice, host, stake: 0 }); });
      socket.on("bet-room-state", (state: BetState) => { setBet(state); if (state.stake) setStakeInput(String(state.stake)); });
      socket.on("bet-agreed", (p: any) => setNotice(`Stake agreed: ${Number(p?.stake || 0).toLocaleString()} coins per player.`));
      socket.on("stake-confirmed", (p: any) => { if (String(p?.playerId || "") === playerId) setNotice(`Your ${Number(p?.stake || bet.stake).toLocaleString()}-coin stake is confirmed.`); });
      socket.on("stake-error", (m: string) => setNotice(m || "Unable to confirm stake."));
      socket.on("bet-settled", (payload: any) => { setBet(prev => ({ ...prev, locked: false, status: "settled" })); setNotice(payload?.winnerId === playerId ? `🎉 You won ${Number(payload?.pot || 0).toLocaleString()} coins!` : "Match settled. The winner received the full pot."); });
      socket.on("roster", (list: Member[]) => { setMembers(list); enrichProfiles(list); const me = list.find(m => m.id === socket.id || m.playerId === playerId); if (me) setSelfPlayerId(me.playerId || playerId); });
      socket.on("game-state", (state: any) => { const roster = Array.isArray(state?.players) ? state.players : []; if (!roster.length) return; setMembers(prev => { const byPlayer = new Map(prev.map(m => [m.playerId || m.id, m])); const merged = roster.map((p: any) => { const key = String(p.playerId || p.id || ""); const old = byPlayer.get(key); return { ...(old || { id: key }), id: old?.id || key, playerId: key, name: String(p.name || old?.name || "Player"), host: Number(p.seat) === 0, ready: !!p.ready, connected: !!p.connected, board: p.board || old?.board, dice: p.dice || old?.dice, avatar: p.avatar || old?.avatar || profiles[String(p.name || old?.name || "")]?.equipped?.avatar }; }); enrichProfiles(merged); return merged; }); });
      socket.on("chat", (m: Msg) => setMessages(x => [...x, m].slice(-80)));
      socket.on("start-game", (payload: any) => { try { localStorage.setItem("ludo-match-board", payload?.board || "classic"); localStorage.setItem("ludo-match-members", JSON.stringify(payload?.members || [])); localStorage.setItem("ludo-match-bet", JSON.stringify(bet)); } catch {} if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current); startTimerRef.current = null; setNotice("Game starting…"); startRef.current?.(); });
      socket.on("room-error", (m: string) => setNotice(m || "Unable to update the room."));
      socket.on("start-error", (m: string) => setNotice(m || "Unable to start the game."));
      socket.on("kicked", () => { setNotice("You were removed by the room host."); kickRef.current?.(); });
      socket.on("room-left", () => { if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current); socket.disconnect(); socketRef.current = null; leaveRef.current?.(); });
      return () => { cancelled = true; if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current); socket.disconnect(); socketRef.current = null; };
    };
    connect();
    return () => { cancelled = true; };
  }, [roomCode, name, host, roomSize]);

  useEffect(() => {
    if (!leaveRequested) return;
    const socket = socketRef.current;
    if (!socket) { leaveRef.current?.(); return; }
    setNotice("Leaving room…");
    let done = false;
    const fallback = window.setTimeout(() => { if (done) return; done = true; socket.disconnect(); socketRef.current = null; leaveRef.current?.(); }, 1000);
    socket.emit("leave-room");
    return () => window.clearTimeout(fallback);
  }, [leaveRequested]);

  const self = members.find(m => m.id === selfId || m.playerId === selfPlayerId);
  const ready = !!self?.ready;
  const serverHost = !!members.find(m => (m.host && m.playerId === selfPlayerId) || (m.host && m.id === selfId));
  const allStaked = !!bet.allStaked;
  const canStart = host && serverHost && members.length === roomSize && members.every(m => m.ready && m.connected !== false) && allStaked && !bet.locked;
  const send = (value = text) => { const v = value.trim(); if (!v) return; socketRef.current?.emit("chat", { text: v }); setText(""); };
  const toggleReady = () => { if (!socketRef.current?.connected) { setNotice("Reconnecting to the room…"); return; } socketRef.current.emit("ready", { ready: !ready }); };
  const confirmStake = () => { if (!socketRef.current?.connected) { setNotice("Reconnecting to the room…"); return; } if (!bet.agreed) { setNotice("Wait for the host to agree and set the stake."); return; } socketRef.current.emit("stake"); };
  const setAgreedStake = () => { if (!socketRef.current?.connected) { setNotice("Reconnecting to the room…"); return; } const n = Math.trunc(Number(stakeInput)); if (!Number.isInteger(n) || n < 500 || n > 10000) { setNotice("Stake must be between 500 and 10,000 coins."); return; } setNotice(`Setting ${n.toLocaleString()}-coin stake…`); socketRef.current.emit("set-stake", { stake: n }); };
  const kick = (id: string) => socketRef.current?.emit("kick-player", id);
  const announceStart = () => { if (!socketRef.current || !canStart) return; setNotice(`Locking ${bet.stake.toLocaleString()} coins per player…`); socketRef.current.emit("start-game"); };
  const voiceMembers = members.filter(m => m.playerId).map(m => ({ id: String(m.playerId), name: m.name, role: m.host ? "owner" : "member", online: m.connected !== false }));
  const slots = Array.from({ length: roomSize }, (_, i) => members[i] || null);

  return <section className={`live-social${compact ? " live-social-compact" : ""}`}>
    <style dangerouslySetInnerHTML={{ __html: ROOM_CSS }} />
    <div className="room-hero"><div><small>ROOM ID</small><strong>{roomCode}</strong></div><button type="button" onClick={() => navigator.clipboard?.writeText(roomCode)} className="room-copy">📋 Copy code</button></div>
    <div className="room-stage">
      <div className="room-stage-head"><b>Players</b><span>{members.length}/{roomSize}</span></div>
      <div className={`room-player-grid room-player-grid-${roomSize}`}>{slots.map((m, i) => m ? <div key={m.id} className={`room-player-card${m.host ? " is-host" : ""}`}><div className="room-avatar-wrap">{m.host && <span className="room-crown">👑</span>}<PlayerIdentityLink username={m.name}><div className="room-avatar">{avatarVisual(profiles[m.name]?.equipped?.avatar || m.avatar, avatarImages[profiles[m.name]?.equipped?.avatar || m.avatar || ""])}</div></PlayerIdentityLink></div><PlayerIdentityLink username={m.name}><strong>{m.name}{(m.id === selfId || m.playerId === selfPlayerId) ? " (you)" : ""}</strong></PlayerIdentityLink><span className={`room-status ${m.ready ? "ready" : "not-ready"}`}>{m.ready ? "Ready" : "Not Ready"}</span>{host && serverHost && !m.host && <button type="button" onClick={() => kick(m.id)} className="room-kick">Kick</button>}</div> : <button key={`empty-${i}`} type="button" className="room-empty" onClick={() => navigator.clipboard?.writeText(roomCode)}><span>＋</span><small>Invite player</small></button>)}</div>
      <div className="room-game-meta"><div><small>STAKE PER PLAYER</small><strong>{bet.stake ? `🪙 ${bet.stake.toLocaleString()} coins` : "🪙 Not agreed yet"}</strong></div><div><small>WINNER POT</small><strong>{bet.pot ? `🪙 ${bet.pot.toLocaleString()} coins` : "Agree in room"}</strong></div></div>
      <div className="room-bet-panel"><div className="room-bet-title"><b>🪙 Stake agreement</b><span>{bet.stakedPlayers || 0}/{roomSize} players staked</span></div>{host && serverHost && <div className="room-bet-row"><input className="room-bet-input" type="number" min={500} max={10000} step={100} value={stakeInput} onChange={e => setStakeInput(e.target.value)} disabled={!!bet.stakedPlayers || bet.locked} placeholder="500–10,000"/><button type="button" className="room-bet-button" onClick={setAgreedStake} disabled={bet.locked}>{bet.agreed ? "✓ Stake set" : "Set agreed stake"}</button></div>}{bet.agreed ? <><div className="room-stake-progress">{bet.allStaked ? "✅ Everyone has confirmed the stake. Host can start when all players are Ready." : `Stake agreed at ${bet.stake.toLocaleString()} coins. Each player must confirm below.`}</div><div style={{ marginTop: 8 }}><button type="button" className="room-bet-button secondary" onClick={confirmStake} disabled={bet.locked || !!bet.allStaked}>{bet.allStaked ? "All stakes confirmed" : "🪙 Stake & Confirm"}</button></div></> : <div className="room-stake-progress">Waiting for the host to set the amount after agreement.</div>}</div>
      <div className="room-controls"><div className="room-voice"><ChatVoice roomCode={roomCode} playerId={selfPlayerId} members={voiceMembers}/></div><button type="button" onClick={toggleReady} className={`room-ready${ready ? " is-ready" : ""}`}>{ready ? "✓ Ready" : "Ready"}</button>{host && serverHost && <button type="button" onClick={announceStart} disabled={!canStart} className="room-start">{bet.allStaked ? "START GAME" : "STAKE TO START"}</button>}<button type="button" onClick={() => setChatOpen(true)} className="room-chat-jump">💬</button></div>
      {notice && <div className="live-social-notice">{notice}</div>}
    </div>
    {chatOpen && <div className="room-chat-drawer" onClick={() => setChatOpen(false)}><div className="room-chat-sheet" onClick={e => e.stopPropagation()}><div className="room-chat-top"><b>Room chat</b><button className="room-chat-close" onClick={() => setChatOpen(false)}>Close</button></div><div className="room-chat-messages">{messages.length === 0 ? <span className="room-chat-empty">No messages yet. Agree the stake here before the host sets it.</span> : messages.map((m, i) => <div key={m.id + "-" + i} className="room-chat-message"><b>{m.name}:</b> {m.text}</div>)}</div><div className="room-chat-quick">{QUICK.map(q => <button key={q} type="button" onClick={() => send(q)}>{q}</button>)}</div><div className="room-chat-composer"><input className="room-chat-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Talk about the stake…"/><button type="button" className="room-chat-send" onClick={() => send()}>Send</button></div></div></div>}
  </section>;
}
