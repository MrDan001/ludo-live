"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import LudoBoard, { BOARD_PALETTES, type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import ChatVoice from "../_components/ChatVoice";
import AvatarRenderer from "../_components/AvatarRenderer";
import { AVATAR_ICONS } from "../_components/EquippedAvatar";
import { canMove, hasLegalMove, nextProgress, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats } from "../../lib/ludoRules";

type Color = "red" | "yellow" | "green" | "blue";
type Face = DiceValue;
type Player = { playerId: string; name: string; seat: number; host?: boolean; ready?: boolean; connected?: boolean; colors?: Color[]; board?: string };
type TokenMap = Record<string, Record<string, { position: number }>>;
type GameState = { status: string; currentPlayerId: string | null; dice: Face | null; pendingMove: Face | null; sixStreak: number; players: Player[]; tokens: TokenMap; winnerId?: string | null; stateRevision?: number; startedAt?: number };
type Msg = { id?: string; name?: string; text?: string; at?: number; type?: string };
type Profile = { equipped?: { avatar?: string } };

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;
const initialTokens = (): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const displayTheme = (value: string): BoardThemeId => value === "midnight-live" ? "night" : value in BOARD_PALETTES ? value as BoardThemeId : "classic";
const emitAudio = (kind: "dice" | "win") => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind })); };
function normalizeTokens(serverTokens: TokenMap): DemoToken[] { return COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => { const raw = serverTokens?.[color]?.[String(id)]?.position; const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0; return { color, id, position, state: position === 0 ? "yard" as const : position === FINISH ? "finished" as const : position > 51 ? "home" as const : "track" as const }; })); }

function ProfileAvatar({ id, imageUrl, size = 44 }: { id?: string; imageUrl?: string | null; size?: number }) {
  const key = String(id || "default");
  return <AvatarRenderer avatar={{ id: key, icon: AVATAR_ICONS[key] || "🧑🏽‍🎮", imageUrl: imageUrl || null }} size={size} border="2px solid #d9b957" background="#171006" fallback={AVATAR_ICONS[key] || "🧑🏽‍🎮"} />;
}

export default function MultiplayerGameCanonical() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const [skinId, setSkinId] = useState("classic");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [roll, setRoll] = useState<Face>(1);
  const [pending, setPending] = useState<Face | null>(null);
  const [remoteRolling, setRemoteRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [revision, setRevision] = useState(-1);
  const [notice, setNotice] = useState("Connecting…");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState<Player | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [avatarImages, setAvatarImages] = useState<Record<string, string>>({});
  const [soundOn, setSoundOn] = useState(true);
  const [unread, setUnread] = useState(0);
  const chatOpenRef = useRef(false);
  const aliveRef = useRef(true), revisionRef = useRef(-1), diceTimerRef = useRef<number | null>(null), moveTimerRef = useRef<number | null>(null), winnerSoundRef = useRef<string | null>(null);
  const players = game?.players ?? [];
  const myPlayer = players.find((p) => p.playerId === me);
  const myColors = useMemo<Color[]>(() => myPlayer?.colors?.length ? myPlayer.colors : playerColorsForSeats(players.length === 2 ? 2 : 4, myPlayer?.seat ?? 0) as Color[], [myPlayer, players.length]);
  const currentId = game?.currentPlayerId ?? "";
  const myTurn = currentId === me;
  const isTournament = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tournament");
  const roomCode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("room") || "" : "";
  const legalTokenKeys = useMemo(() => pending === null || !myTurn ? [] : tokens.filter((t) => myColors.includes(t.color) && canMove(tokens, t, pending)).map((t) => `${t.color}:${t.id}`), [pending, myTurn, tokens, myColors]);

  const applyServerState = useCallback((next: GameState) => {
    const nextRevision = Number(next.stateRevision ?? -1);
    if (nextRevision >= 0 && revisionRef.current >= 0 && nextRevision < revisionRef.current) return false;
    if (nextRevision >= 0) { revisionRef.current = nextRevision; setRevision(nextRevision); }
    setGame(next); setTokens(normalizeTokens(next.tokens ?? {})); return true;
  }, []);

  useEffect(() => { aliveRef.current = true; try { const saved = localStorage.getItem("ludo-match-board"); if (saved) { setSkinId(saved); setTheme(displayTheme(saved)); } } catch {} const load = async () => { try { const r = await fetch("/api/customization", { cache: "no-store" }); const d = await r.json(); const equipped = String(d?.equippedBoard || ""); if (!equipped || !aliveRef.current) return; setSkinId(equipped); setTheme(displayTheme(equipped)); try { localStorage.setItem("ludo-match-board", equipped); } catch {} } catch {} }; void load(); return () => { aliveRef.current = false; }; }, []);

  useEffect(() => {
    let mounted = true;
    const connect = async () => {
      let playerId = "", profileName = "Player";
      try { const r = await fetch("/api/auth", { cache: "no-store" }); const d = await r.json(); playerId = String(d?.user?.id || ""); profileName = String(d?.user?.username || "Player"); } catch {}
      if (!mounted || !playerId) return;
      setMe(playerId);
      const params = new URLSearchParams(window.location.search), roomName = profileName || params.get("name") || "Player";
      let roomSize = Number(params.get("size") || 4);
      try { const saved = JSON.parse(localStorage.getItem("ludo-room") || "null"); if (!params.get("size")) roomSize = Number(saved?.players) === 2 ? 2 : 4; } catch {}
      const nextSocket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 250 });
      setSocket(nextSocket);
      const clearDiceTimer = () => { if (diceTimerRef.current !== null) { window.clearTimeout(diceTimerRef.current); diceTimerRef.current = null; } };
      const clearMoveTimer = () => { if (moveTimerRef.current !== null) { window.clearTimeout(moveTimerRef.current); moveTimerRef.current = null; } };
      nextSocket.on("connect", () => { if (!mounted) return; setNotice(isTournament ? "TOURNAMENT MATCH" : "LIVE MATCH"); if (roomCode) { let board = "classic"; try { board = localStorage.getItem("ludo-match-board") || "classic"; } catch {} nextSocket.emit("join-room", { roomCode, name: roomName, roomSize, playerId, board, dice: "classic" }); } });
      nextSocket.on("roster", (members: Player[]) => { const host = members.find((m) => m.host); if (!host?.board || !mounted) return; const hostSkin = String(host.board); setSkinId(hostSkin); setTheme(displayTheme(hostSkin)); });
      nextSocket.on("start-game", ({ board }: { board?: string }) => { if (!mounted) return; if (board) { setSkinId(String(board)); setTheme(displayTheme(String(board))); } setNotice(isTournament ? "TOURNAMENT MATCH" : "LIVE MATCH"); });
      nextSocket.on("start-error", (message: string) => { if (mounted) setNotice(message); });
      nextSocket.on("chat", (message: Msg) => { if (!mounted) return; setMessages((prev) => [...prev, message].slice(-80)); if (!chatOpenRef.current) setUnread((n) => n + 1); });
      nextSocket.on("game-dice", (event: { playerId: string; value: Face; stateRevision?: number }) => { if (!mounted) return; const r = Number(event.stateRevision ?? -1); if (r >= 0 && revisionRef.current >= 0 && r < revisionRef.current) return; if (r >= 0) { revisionRef.current = r; setRevision(r); } setRoll(event.value); setRemoteRolling(true); emitAudio("dice"); setNotice(event.playerId === playerId ? `You rolled ${event.value}` : "Opponent is rolling…"); clearDiceTimer(); diceTimerRef.current = window.setTimeout(() => { if (mounted) setRemoteRolling(false); diceTimerRef.current = null; }, 900); });
      nextSocket.on("game-state", (next: GameState) => { if (!mounted) return; if (!applyServerState(next)) return; if (next.dice !== null) setRoll(next.dice); setPending(next.currentPlayerId === playerId ? next.pendingMove : null); if (next.winnerId && winnerSoundRef.current !== next.winnerId) { winnerSoundRef.current = next.winnerId; emitAudio("win"); } if (next.winnerId) { const name = next.players.find((p) => p.playerId === next.winnerId)?.name || "Player"; setNotice(next.winnerId === playerId ? "🏆 YOU WON" : `${name} won`); } else if (next.status === "paused") setNotice("Waiting for reconnection…"); else if (next.currentPlayerId === playerId) setNotice(next.pendingMove !== null ? `Pick a token • ${next.pendingMove}` : "Your turn"); else setNotice(`${next.players.find((p) => p.playerId === next.currentPlayerId)?.name || "Player"}'s turn`); });
      nextSocket.on("game-moved", () => { if (!mounted) return; setAnimating(true); clearMoveTimer(); moveTimerRef.current = window.setTimeout(() => { if (mounted) setAnimating(false); moveTimerRef.current = null; }, 650); });
      nextSocket.on("disconnect", () => { if (mounted) setNotice("Reconnecting…"); });
      return () => { clearDiceTimer(); clearMoveTimer(); nextSocket.disconnect(); };
    };
    void connect(); return () => { mounted = false; };
  }, [applyServerState, isTournament, roomCode]);

  useEffect(() => {
    if (!game?.winnerId || !me || isTournament) return;
    const winnerId = String(game.winnerId);
    const matchKey = `multiplayer:${roomCode || "room"}:winner:${winnerId}:revision:${revision >= 0 ? revision : "final"}`;
    void fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "game_win", eventKey: matchKey }) }).catch(() => {});
  }, [game?.winnerId, me, isTournament, roomCode, revision]);

  useEffect(() => { if (!socket || !game || !myTurn || pending === null || hasLegalMove(tokens, myColors, pending)) return; setPending(null); socket.emit("game-move", { tokenId: "__skip__", to: 0 }); }, [socket, game, myTurn, pending, tokens, myColors]);
  const chooseToken = useCallback((color: Color, id: number) => { if (!socket || !game || !myTurn || pending === null || animating) return; const token = tokens.find((t) => t.color === color && t.id === id); if (!token || !myColors.includes(color) || !canMove(tokens, token, pending)) return; const target = nextProgress(token.position, pending); if (target === null) return; setPending(null); setAnimating(true); socket.emit("game-move", { tokenId: `${color}:${id}`, to: target }); setNotice("Moving…"); }, [socket, game, myTurn, pending, animating, tokens, myColors]);
  const handleRoll = useCallback(() => { if (!socket || !game || !myTurn || pending !== null || animating || remoteRolling || game.status !== "playing") return; socket.emit("game-roll"); }, [socket, game, myTurn, pending, animating, remoteRolling]);
  const sendChat = (value: string) => { const text = value.trim(); if (!socket || !text) return; socket.emit("chat", { text }); };
  const openChat = () => { chatOpenRef.current = true; setChatOpen(true); setUnread(0); };
  const closeChat = () => { chatOpenRef.current = false; setChatOpen(false); setUnread(0); };
  useEffect(() => { const loadProfiles = async () => { if (!players.length) return; const names = [...new Set(players.map((p) => p.name).filter(Boolean))]; const rows = await Promise.all(names.map(async (name) => { try { const r = await fetch(`/api/player/${encodeURIComponent(name)}`, { cache: "no-store" }); if (!r.ok) return null; const d = await r.json(); return [name, { equipped: d?.player?.equipped || {} }] as const; } catch { return null; } })); const next = { ...profiles }; for (const row of rows) if (row) next[row[0]] = row[1]; setProfiles(next); }; void loadProfiles(); }, [players.length]);
  useEffect(() => { let dead = false; fetch("/api/shop/catalog", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (dead) return; const map: Record<string, string> = {}; for (const item of Array.isArray(d?.items) ? d.items : []) if (item?.type === "avatar" && item?.id && item?.imageUrl) map[String(item.id)] = String(item.imageUrl); setAvatarImages(map); }).catch(() => {}); return () => { dead = true; }; }, []);
  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);
  const voiceMembers = useMemo(() => players.map((p) => ({ id: String(p.playerId), name: p.name, role: p.host ? "owner" : "member", online: p.connected !== false })), [players]);

  const [wallet, setWallet] = useState<{ coins: number }>({ coins: 0 });
  useEffect(() => {
    let dead = false;
    fetch("/api/wallet", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (!dead && d?.wallet) setWallet({ coins: Number(d.wallet.coins) || 0 });
    }).catch(() => {});
    return () => { dead = true; };
  }, []);

  const [showPlayers, setShowPlayers] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const leaveMatch = () => { window.location.href = "/home"; };

  return <main className="pg-game">
    <div className="pg-shell">
      <header className="pg-header">
        {sortedPlayers.map((p) => {
          const active = p.playerId === currentId, mine = p.playerId === me;
          const avatarId = profiles[p.name]?.equipped?.avatar || "default";
          return <div key={p.playerId} className={`pg-player ${mine ? "pg-mine" : ""}`}>
            {p.host && <span className="pg-crown">♛</span>}
            <button type="button" className="pg-avatar-btn" onClick={() => setProfileOpen(p)}>
              <div className="pg-avatar"><ProfileAvatar id={avatarId} imageUrl={avatarImages[avatarId]} size={64} /><span className="pg-online" /></div>
            </button>
            <div className="pg-player-copy">
              <b>{p.name}{mine ? " (You)" : ""}</b>
              <small className={active ? "pg-mine-turn" : mine ? "" : "pg-in-match"}>{active ? "● Your Turn" : "● In Match"}</small>
            </div>
            <span className="pg-star">★ {p.seat + 1}</span>
          </div>;
        })}
        <div className="pg-logo"><span>♛</span><strong>LUDO</strong><b>LIVE</b></div>
        <button type="button" className="pg-menu" onClick={() => setShowPlayers(true)} aria-label="Menu">☰</button>
      </header>

      <section className="lux-board-zone"><div className="pg-board-frame"><LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound /></div></section>

      <section className="pg-bottom">
        <div className="pg-profile-card" onClick={() => setProfileOpen(myPlayer || null)}>
          <div className="pg-profile-avatar"><ProfileAvatar id={profiles[myPlayer?.name || ""]?.equipped?.avatar || "default"} imageUrl={avatarImages[profiles[myPlayer?.name || ""]?.equipped?.avatar || "default"]} size={68} /><span className="pg-online" /></div>
          <button className="pg-edit" aria-label="Profile">✎</button>
          <strong>{myPlayer?.name || "Player"}</strong>
          <div className="pg-stars">★ {myPlayer ? myPlayer.seat + 1 : 1}</div>
          <div className="pg-coin-row"><span>◉</span>{wallet.coins.toLocaleString()}<a href="/shop">+</a></div>
        </div>

        <div className={`pg-turn-card ${myTurn ? "mine" : ""}`}>
          <div className="pg-turn-title">{game?.winnerId ? "MATCH OVER" : myTurn ? "YOUR TURN" : "OPPONENT TURN"}</div>
          <p>{notice}</p>
          <div className="pg-dice"><DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn || pending !== null || animating || remoteRolling || !game || game.status !== "playing"} botRolling={remoteRolling} /></div>
        </div>

        <div className="pg-comm-actions">
          <button type="button" onClick={openChat}><span>💬</span><b>Chat</b>{unread > 0 && <i>{Math.min(unread, 9)}</i>}</button>
          <div className="pg-voice"><ChatVoice roomCode={roomCode} playerId={me} members={voiceMembers} /></div>
        </div>
      </section>

      <section className="pg-reaction-row">{["👋 Hi!", "😂 LOL", "🔥 Nice!", "👏 Good move", "🎉 GG", "😎"].map(q => <button key={q} onClick={() => sendChat(q)}>{q}</button>)}</section>

      <section className="pg-utility-row">
        <button className="pg-leave" onClick={() => setShowLeave(true)}>⇥ Leave Match</button>
        <button onClick={() => setShowPlayers(true)}>👥 Players</button>
        <button onClick={() => setSoundOn(v => !v)}>🔊 Sound</button>
        <button className="pg-room" onClick={() => navigator.clipboard?.writeText(roomCode)}>🛡 Room ID: {roomCode || "—"} ▣</button>
      </section>
    </div>

    {chatOpen && <div className="lux-modal-bg" onClick={closeChat}><section className="lux-chat" onClick={(e) => e.stopPropagation()}><header><div><b>💬 In-game Chat</b><small>Live with everyone in this match</small></div><button onClick={closeChat}>✕</button></header><div className="lux-chat-list">{messages.length === 0 ? <p className="lux-empty">No messages yet. Say hello.</p> : messages.map((m, i) => <div className="lux-message" key={`${m.id || "m"}-${i}`}><ProfileAvatar id={profiles[m.name || ""]?.equipped?.avatar || "default"} imageUrl={avatarImages[profiles[m.name || ""]?.equipped?.avatar || "default"]} size={34} /><div><b>{m.name || "Player"}</b><p>{m.text || ""}</p></div></div>)}</div><div className="lux-quick">{["👋 Hi!", "😂 LOL", "🔥 Nice!", "👏 Good move", "🎉 GG", "😎"].map((q) => <button key={q} onClick={() => sendChat(q)}>{q}</button>)}</div><form className="lux-compose" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem("chat") as HTMLInputElement; sendChat(input.value); input.value = ""; }}><input name="chat" placeholder="Type a message…" autoComplete="off" /><button>➤</button></form></section></div>}

    {profileOpen && <div className="lux-modal-bg" onClick={() => setProfileOpen(null)}><section className="lux-profile-sheet" onClick={(e) => e.stopPropagation()}><button className="lux-close" onClick={() => setProfileOpen(null)}>✕</button><div className="lux-profile-hero"><ProfileAvatar id={profiles[profileOpen.name]?.equipped?.avatar || "default"} imageUrl={avatarImages[profiles[profileOpen.name]?.equipped?.avatar || "default"]} size={82} /><h2>{profileOpen.name}{profileOpen.playerId === me ? " · You" : ""}</h2><small>{profileOpen.host ? "♛ HOST" : "PLAYER"} · SEAT {profileOpen.seat + 1}</small></div><div className="lux-profile-grid"><div><b>{profileOpen.ready ? "READY" : "IN MATCH"}</b><small>Status</small></div><div><b>{profileOpen.connected === false ? "OFFLINE" : "ONLINE"}</b><small>Connection</small></div><div><b>{profileOpen.colors?.join(" · ") || "—"}</b><small>Team</small></div><div><b>{skinId}</b><small>Board</small></div></div></section></div>}

    {showPlayers && <div className="lux-modal-bg" onClick={() => setShowPlayers(false)}><section className="lux-profile-sheet" onClick={(e) => e.stopPropagation()}><button className="lux-close" onClick={() => setShowPlayers(false)}>✕</button><h2 style={{margin:"6px 0 14px"}}>Players</h2>{sortedPlayers.map(p => <div key={p.playerId} className="pg-roster-row"><b>{p.host ? "👑 " : ""}{p.name}{p.playerId===me?" (You)":""}</b><span>{p.connected===false?"Offline":p.ready?"Ready":"In match"}</span></div>)}</section></div>}

    {showLeave && <div className="lux-modal-bg" onClick={() => setShowLeave(false)}><section className="lux-profile-sheet" onClick={(e) => e.stopPropagation()}><h2 style={{margin:"6px 0 10px"}}>Leave this match?</h2><p style={{color:"#a99b77",marginBottom:16}}>You'll forfeit the current game if you leave now.</p><div style={{display:"flex",gap:10}}><button className="pg-leave" style={{flex:1}} onClick={leaveMatch}>Leave</button><button style={{flex:1}} onClick={() => setShowLeave(false)}>Cancel</button></div></section></div>}

    <style jsx global>{`
      html,body{margin:0;padding:0;background:#0a0805;overflow:hidden}
      *{box-sizing:border-box}
      .pg-game{position:fixed;inset:0;background:radial-gradient(circle at 50% -10%,#241a08 0,#0a0805 45%,#020202 100%);color:#f7ecd0;overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .pg-shell{width:100%;height:100dvh;max-width:920px;margin:auto;padding:10px;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto auto;gap:8px;overflow-y:auto}
      .pg-header{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px 60px 10px 10px;border:1px solid rgba(214,180,74,.6);border-radius:24px;background:linear-gradient(180deg,rgba(24,19,10,.95),rgba(6,5,4,.95));min-height:96px}
      .pg-player{position:relative;display:flex;align-items:center;gap:10px;padding:8px;border:1px solid rgba(214,180,74,.4);border-radius:18px;background:rgba(255,255,255,.03)}
      .pg-crown{position:absolute;left:-4px;top:-16px;font-size:24px;color:#f3c63e}
      .pg-avatar{position:relative;width:60px;height:60px}.pg-online{position:absolute;right:0;bottom:0;width:12px;height:12px;border-radius:50%;background:#22d67a;border:2px solid #0d0a06}
      .pg-player-copy{min-width:0}.pg-player-copy b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px}.pg-player-copy small{display:block;margin-top:3px;font-size:10px;font-weight:800;color:#ff5566}
      .pg-mine-turn{color:#22d67a!important}.pg-in-match{color:#ff5566}.pg-star{margin-left:auto;font-size:12px;color:#f0c94d;font-weight:900}
      .pg-logo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;line-height:.8;color:#f5d76e;text-shadow:0 0 14px rgba(240,190,60,.4)}
      .pg-logo span{font-size:20px}.pg-logo strong{font-family:Georgia,serif;font-size:20px;letter-spacing:1px}.pg-logo b{font-family:Georgia,serif;font-size:14px}
      .pg-menu{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:48px;height:52px;border:1px solid rgba(214,180,74,.6);border-radius:16px;background:#100e08;color:#f3c943;font-size:26px}
      .lux-board-zone{min-height:0;display:grid;place-items:center;overflow:hidden}
      .pg-board-frame{width:min(calc(100vw - 20px),calc(100dvh - 350px));max-width:100%;aspect-ratio:1/1;border-radius:26px;padding:4px;background:linear-gradient(145deg,#f2d36b,#6d4b10 30%,#d8b54a 70%,#5e3f0b);box-shadow:0 0 0 1px rgba(255,235,145,.3),0 12px 34px rgba(0,0,0,.5)}
      .pg-board-frame>div{width:100%!important;height:100%!important;aspect-ratio:1/1!important;border-radius:22px;overflow:hidden}
      .pg-bottom{display:grid;grid-template-columns:1fr 1.6fr 96px;gap:8px}.pg-profile-card,.pg-turn-card{position:relative;border:1px solid rgba(214,180,74,.5);border-radius:20px;background:linear-gradient(180deg,rgba(20,15,7,.97),rgba(5,5,4,.97))}
      .pg-profile-card{padding:12px;cursor:pointer;min-height:150px}.pg-profile-avatar{position:relative;width:64px;height:64px;margin-bottom:6px}.pg-edit{position:absolute;right:11px;top:9px;background:none;border:0;color:#f1ca58;font-size:16px}.pg-profile-card strong{display:block;font-size:15px}.pg-stars{color:#f2c33b;font-size:13px;margin-top:5px}
      .pg-coin-row{margin-top:8px;border:1px solid rgba(205,159,48,.4);border-radius:14px;padding:8px 10px;display:flex;align-items:center;gap:7px;font-weight:900}.pg-coin-row span{color:#f2c33b}.pg-coin-row a{margin-left:auto;width:26px;height:26px;border-radius:50%;border:1px solid #24d96b;background:#0e1b11;color:#25dc6d;display:grid;place-items:center;text-decoration:none;font-size:18px}
      .pg-turn-card{padding:14px 12px;display:flex;flex-direction:column;justify-content:center;min-height:150px}.pg-turn-title{font-size:18px;font-weight:950;color:#f0bd37}.pg-turn-card.mine .pg-turn-title{color:#22d67a}.pg-turn-card p{margin:8px 0;color:#a99b77;font-size:12px}.pg-dice{align-self:flex-end;margin-top:-30px}
      .pg-comm-actions{display:flex;flex-direction:column;gap:8px}.pg-comm-actions>button{flex:1;border:1px solid rgba(199,154,40,.55);border-radius:16px;background:linear-gradient(145deg,#17130a,#060605);color:#f5e4a7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;position:relative}.pg-comm-actions span{font-size:20px}.pg-comm-actions b{font-size:10px}.pg-comm-actions i{position:absolute;right:6px;top:6px;background:#d92e35;color:#fff;border-radius:99px;min-width:15px;height:15px;font:900 9px/15px system-ui;font-style:normal;text-align:center}
      .pg-voice{flex:1}.pg-voice>div{height:100%}.pg-voice button{width:100%!important;height:100%!important;border-radius:16px!important;border:1px solid rgba(199,154,40,.55)!important;background:linear-gradient(145deg,#17130a,#060605)!important;font-size:10px!important}
      .pg-reaction-row{display:flex;gap:6px;flex-wrap:wrap}.pg-reaction-row button{flex:1;min-width:70px;border:1px solid rgba(194,150,39,.45);border-radius:20px;background:#0c0b08;color:#f2d47a;font-weight:800;font-size:11px;padding:8px 4px;white-space:nowrap}
      .pg-utility-row{display:flex;gap:6px}.pg-utility-row button{flex:1;min-height:40px;border:1px solid rgba(194,150,39,.45);border-radius:20px;background:#0c0b08;color:#f2d47a;font-weight:800;font-size:11px}.pg-leave{color:#ff5566!important}.pg-room{flex:1.6!important;color:#999!important}
      .pg-roster-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}
      .lux-modal-bg{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:9px}.lux-chat,.lux-profile-sheet{width:min(560px,100%);border:1px solid rgba(227,195,94,.62);border-radius:25px 25px 16px 16px;background:linear-gradient(155deg,#211605,#080806 75%);box-shadow:0 -15px 50px rgba(0,0,0,.55);color:#f7edcf}.lux-chat{max-height:78dvh;padding:13px;display:flex;flex-direction:column}
      .lux-chat header{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px}.lux-chat header b{display:block;color:#f1d878;font-size:16px}.lux-chat header small{display:block;color:#8e815f;font-size:9px;margin-top:3px}.lux-chat header button,.lux-close{width:35px;height:35px;border-radius:50%;border:1px solid rgba(221,187,81,.35);background:#100c05;color:#f1d878}
      .lux-chat-list{overflow:auto;min-height:100px;max-height:43dvh}.lux-empty{text-align:center;color:#897c5b;padding:35px 0}.lux-message{display:flex;gap:8px;align-items:flex-start;padding:6px 2px}.lux-message>b,.lux-message div>b{color:#e5c96c;font-size:10px}.lux-message p{margin:3px 0;padding:8px 10px;border-radius:12px;background:#130e06;color:#e9dfc4;font-size:11px}
      .lux-quick{display:flex;gap:5px;overflow:auto;padding:7px 0}.lux-quick button{white-space:nowrap;border:1px solid rgba(221,187,81,.2);background:#120d05;color:#dfcf9b;border-radius:999px;padding:7px 9px;font-size:9px}.lux-compose{display:flex;gap:6px}.lux-compose input{flex:1;min-width:0;border:1px solid rgba(221,187,81,.38);background:#080705;color:white;border-radius:13px;padding:11px;outline:none}.lux-compose button{width:45px;border:0;border-radius:13px;background:linear-gradient(145deg,#f0d36d,#9c7419);color:#140d02;font-size:18px}
      .lux-profile-sheet{padding:18px;position:relative}.lux-profile-hero{text-align:center;padding:12px 0 20px}.lux-profile-hero>div{margin:auto}.lux-profile-hero h2{margin:10px 0 4px;font-family:Georgia,serif;color:#f2d67a}.lux-profile-hero small{font-size:9px;letter-spacing:1px;color:#958760}.lux-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.lux-profile-grid div{padding:12px;border:1px solid rgba(221,187,81,.2);border-radius:13px;background:rgba(255,255,255,.025)}.lux-profile-grid b{display:block;color:#f0d36d;font-size:10px}.lux-profile-grid small{display:block;color:#817653;font-size:8px;margin-top:4px}
      @media(max-width:520px){.pg-header{grid-template-columns:1fr 1fr;padding-right:58px;min-height:82px}.pg-avatar,.pg-online{width:48px;height:48px}.pg-player-copy b{max-width:80px;font-size:12px}.pg-bottom{grid-template-columns:1fr 1.5fr 76px}.pg-board-frame{width:min(calc(100vw - 16px),calc(100dvh - 320px))}.pg-dice{transform:scale(.78);transform-origin:bottom right}}
    `}</style>
  </main>;
}
