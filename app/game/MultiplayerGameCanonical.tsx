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
type GameState = { status: string; currentPlayerId: string | null; dice: Face | null; pendingMove: Face | null; sixStreak: number; players: Player[]; tokens: TokenMap; winnerId?: string | null; stateRevision?: number };
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

  return <main className="lux-game" style={{ "--accent": palette.accent, "--bg": palette.bg } as React.CSSProperties}>
    <div className="lux-shell">
      <header className="lux-header">
        <div className="lux-player-strip">
          {sortedPlayers.map((p) => { const active = p.playerId === currentId, mine = p.playerId === me, avatarId = profiles[p.name]?.equipped?.avatar || "default"; return <button key={p.playerId} type="button" className={`lux-player ${active ? "active" : ""} ${mine ? "mine" : ""}`} onClick={() => setProfileOpen(p)} aria-label={`Open ${p.name} profile`}><div className="lux-avatar ig-avatar" aria-label={p.name}><ProfileAvatar id={avatarId} imageUrl={avatarImages[avatarId]} size={40} /><span className="lux-online" /></div><div className="lux-player-copy"><b>{p.name}{mine ? " · You" : ""}</b><small>{active ? "YOUR TURN" : p.ready ? "READY" : "IN MATCH"}</small></div>{p.host && <span className="lux-crown">♛</span>}</button>; })}
        </div>
        <div className="lux-logo"><span>♛</span><strong>LUDO</strong><small>LIVE</small></div>
        <button type="button" className="lux-menu" onClick={() => setProfileOpen(myPlayer || null)} aria-label="Open profile">☰</button>
      </header>

      <section className="lux-board-zone"><div className="lux-board-frame"><LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound /></div></section>

      <section className="lux-control-zone">
        <div className="lux-profile-card" onClick={() => setProfileOpen(myPlayer || null)}><div className="lux-card-avatar ig-avatar" aria-label={myPlayer?.name || "Player"}><ProfileAvatar id={profiles[myPlayer?.name || ""]?.equipped?.avatar || "default"} imageUrl={avatarImages[profiles[myPlayer?.name || ""]?.equipped?.avatar || "default"]} size={48} /><span className="lux-online" /></div><div><b>{myPlayer?.name || "Player"}</b><small>{myTurn ? "Ready to roll" : "Watching match"}</small></div><span className="lux-star">★ {myPlayer ? myPlayer.seat + 1 : 1}</span></div>
        <div className={`lux-turn-card ${myTurn ? "my-turn" : ""}`}><span className="lux-turn-dot" /><div><b>{game?.winnerId ? "MATCH OVER" : myTurn ? "YOUR TURN" : "OPPONENT TURN"}</b><small>{notice}</small></div><div className="lux-dice"><DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn || pending !== null || animating || remoteRolling || !game || game.status !== "playing"} botRolling={remoteRolling} /></div></div>
        <div className="lux-comm-stack"><button type="button" onClick={openChat} className="lux-comm"><span>💬</span><b>Chat</b>{unread > 0 && <i>{Math.min(unread, 9)}</i>}</button><div className="lux-voice"><ChatVoice roomCode={roomCode} playerId={me} members={voiceMembers} /></div></div>
        </section>

      <nav className="lux-tools"><button type="button" onClick={() => setProfileOpen(myPlayer || null)}>👤 <span>Profile</span></button><button type="button" onClick={() => setProfileOpen(sortedPlayers[0] || null)}>👥 <span>Players</span></button><button type="button" onClick={() => setSoundOn((v) => !v)}>🔊 <span>{soundOn ? "Sound" : "Muted"}</span></button><span className="lux-room">ROOM <b>{roomCode || "—"}</b></span></nav>
    </div>

    {chatOpen && <div className="lux-modal-bg" onClick={closeChat}><section className="lux-chat" onClick={(e) => e.stopPropagation()}><header><div><b>💬 In-game Chat</b><small>Live with everyone in this match</small></div><button onClick={closeChat}>✕</button></header><div className="lux-chat-list">{messages.length === 0 ? <p className="lux-empty">No messages yet. Say hello.</p> : messages.map((m, i) => <div className="lux-message" key={`${m.id || "m"}-${i}`}><ProfileAvatar id={profiles[m.name || ""]?.equipped?.avatar || "default"} imageUrl={avatarImages[profiles[m.name || ""]?.equipped?.avatar || "default"]} size={34} /><div><b>{m.name || "Player"}</b><p>{m.text || ""}</p></div></div>)}</div><div className="lux-quick">{["👋 Hi!", "😂 LOL", "🔥 Nice!", "👏 Good move", "🎉 GG", "😎"].map((q) => <button key={q} onClick={() => sendChat(q)}>{q}</button>)}</div><form className="lux-compose" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem("chat") as HTMLInputElement; sendChat(input.value); input.value = ""; }}><input name="chat" placeholder="Type a message…" autoComplete="off" /><button>➤</button></form></section></div>}

    {profileOpen && <div className="lux-modal-bg" onClick={() => setProfileOpen(null)}><section className="lux-profile-sheet" onClick={(e) => e.stopPropagation()}><button className="lux-close" onClick={() => setProfileOpen(null)}>✕</button><div className="lux-profile-hero"><ProfileAvatar id={profiles[profileOpen.name]?.equipped?.avatar || "default"} imageUrl={avatarImages[profiles[profileOpen.name]?.equipped?.avatar || "default"]} size={82} /><h2>{profileOpen.name}{profileOpen.playerId === me ? " · You" : ""}</h2><small>{profileOpen.host ? "♛ HOST" : "PLAYER"} · SEAT {profileOpen.seat + 1}</small></div><div className="lux-profile-grid"><div><b>{profileOpen.ready ? "READY" : "IN MATCH"}</b><small>Status</small></div><div><b>{profileOpen.connected === false ? "OFFLINE" : "ONLINE"}</b><small>Connection</small></div><div><b>{profileOpen.colors?.join(" · ") || "—"}</b><small>Team</small></div><div><b>{skinId}</b><small>Board</small></div></div></section></div>}

    <style jsx global>{`
      html,body{margin:0;padding:0;background:#030405;overflow:hidden}
      *{box-sizing:border-box}
      .lux-game{position:fixed;inset:0;background:radial-gradient(circle at 50% 8%,#241a08 0,#090806 34%,#020304 78%);color:#f7edcf;overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .lux-shell{width:100%;height:100dvh;max-width:900px;margin:auto;padding:7px;display:grid;grid-template-rows:58px minmax(0,1fr) 104px 42px;gap:6px}
      .lux-header{display:grid;grid-template-columns:1fr auto 42px;gap:8px;align-items:center;padding:4px 6px;border:1px solid rgba(224,190,85,.58);border-radius:20px;background:linear-gradient(180deg,rgba(27,20,8,.94),rgba(8,8,7,.88));box-shadow:0 8px 26px rgba(0,0,0,.35),inset 0 1px rgba(255,240,170,.08)}
      .lux-player-strip{display:flex;gap:6px;overflow-x:auto;min-width:0}.lux-player{position:relative;display:flex;align-items:center;gap:7px;min-width:138px;padding:5px 8px;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:rgba(255,255,255,.035);color:#fff;text-align:left;cursor:pointer}.lux-player.active{border-color:#e7c75d;box-shadow:0 0 15px rgba(226,187,64,.22)}.lux-player.mine{background:rgba(221,182,64,.07)}.lux-avatar{position:relative;display:grid;place-items:center;flex:none}.lux-online{position:absolute;right:-1px;bottom:0;width:9px;height:9px;border:2px solid #161007;border-radius:50%;background:#24d66d;z-index:3}.lux-player-copy{min-width:0}.lux-player-copy b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:92px}.lux-player-copy small{display:block;margin-top:2px;font-size:7px;letter-spacing:1px;font-weight:900;opacity:.55}.lux-crown{margin-left:auto;color:#f5d86d;font-size:18px}.lux-logo{display:flex;flex-direction:column;align-items:center;line-height:.78;color:#e9c85b;text-shadow:0 0 16px rgba(230,190,60,.35)}.lux-logo span{font-size:14px}.lux-logo strong{font-family:Georgia,serif;font-size:17px;letter-spacing:2px}.lux-logo small{font-size:7px;letter-spacing:3px;font-weight:900}.lux-menu{width:40px;height:40px;border:1px solid rgba(225,190,83,.35);border-radius:13px;background:#110d06;color:#e9c85b;font-size:20px}
      .lux-board-zone{min-height:0;display:grid;place-items:center;overflow:hidden}.lux-board-frame{width:min(calc(100vw - 14px),calc(100dvh - 178px));max-width:100%;aspect-ratio:1/1;display:grid;place-items:center;position:relative;border-radius:26px;padding:4px;background:linear-gradient(145deg,#f2d36b,#6d4b10 30%,#d8b54a 70%,#5e3f0b);box-shadow:0 0 0 1px rgba(255,235,145,.35),0 12px 35px rgba(0,0,0,.5)}.lux-board-frame>div{width:100%!important;height:100%!important;aspect-ratio:1/1!important;border-radius:22px;overflow:hidden}
      .lux-control-zone{display:grid;grid-template-columns:1fr 1.5fr auto;gap:7px;min-height:0}.lux-profile-card,.lux-turn-card{border:1px solid rgba(221,187,81,.5);border-radius:17px;background:linear-gradient(145deg,rgba(27,20,8,.96),rgba(8,8,7,.94));box-shadow:0 8px 25px rgba(0,0,0,.3);min-width:0}.lux-profile-card{display:flex;align-items:center;gap:8px;padding:7px;cursor:pointer}.lux-profile-card b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lux-profile-card small{display:block;margin-top:3px;color:#a99b77;font-size:8px}.lux-card-avatar{position:relative}.lux-star{margin-left:auto;color:#e9c85b;font-size:9px;font-weight:900}.lux-turn-card{display:flex;align-items:center;padding:7px 9px;position:relative;overflow:hidden}.lux-turn-dot{width:8px;height:8px;border-radius:50%;background:#dcad37;box-shadow:0 0 12px #dcad37;margin-right:7px;flex:none}.lux-turn-card.my-turn .lux-turn-dot{background:#25df70;box-shadow:0 0 14px #25df70}.lux-turn-card b{display:block;font-size:11px;letter-spacing:1px}.lux-turn-card small{display:block;margin-top:3px;color:#a99b77;font-size:8px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lux-dice{margin-left:auto;height:86px;display:grid;place-items:center}.lux-dice button{transform:scale(.68);transform-origin:right center}.lux-comm-stack{display:flex;flex-direction:column;gap:6px}.lux-comm{flex:1;min-width:60px;border:1px solid rgba(221,187,81,.48);border-radius:16px;background:linear-gradient(145deg,#211706,#090806);color:#f1d878;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}.lux-comm span{font-size:20px}.lux-comm b{font-size:8px;margin-top:2px}.lux-comm i{position:absolute;right:4px;top:4px;background:#d92e35;color:white;border-radius:99px;min-width:16px;height:16px;font:900 9px/16px system-ui;font-style:normal;text-align:center}.lux-voice{flex:1;min-width:60px}.lux-voice>div{height:100%;display:grid;place-items:center}.lux-voice button{width:100%!important;height:100%!important;border-radius:16px!important;border:1px solid rgba(221,187,81,.48)!important;background:linear-gradient(145deg,#211706,#090806)!important;color:#f1d878!important;font-size:8px!important;font-weight:900!important;padding:4px!important}
      .lux-tools{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid rgba(221,187,81,.35);border-radius:15px;background:rgba(9,8,6,.9);padding:4px;overflow:hidden}.lux-tools button{border:0;background:transparent;color:#d7c98e;font-size:9px;font-weight:900;padding:7px 9px;border-radius:10px}.lux-tools button:hover{background:rgba(221,187,81,.08)}.lux-tools span{margin-left:auto}.lux-room{font-size:8px;color:#756b50;padding-right:7px;white-space:nowrap}.lux-room b{color:#d6bd65;margin-left:3px}
      .lux-modal-bg{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;padding:9px}.lux-chat,.lux-profile-sheet{width:min(560px,100%);border:1px solid rgba(227,195,94,.62);border-radius:25px 25px 16px 16px;background:linear-gradient(155deg,#211605,#080806 75%);box-shadow:0 -15px 50px rgba(0,0,0,.55);color:#f7edcf}.lux-chat{max-height:78dvh;padding:13px;display:flex;flex-direction:column}.lux-chat header{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px}.lux-chat header b{display:block;color:#f1d878;font-size:16px}.lux-chat header small{display:block;color:#8e815f;font-size:9px;margin-top:3px}.lux-chat header button,.lux-close{width:35px;height:35px;border-radius:50%;border:1px solid rgba(221,187,81,.35);background:#100c05;color:#f1d878}.lux-chat-list{overflow:auto;min-height:100px;max-height:43dvh}.lux-empty{text-align:center;color:#897c5b;padding:35px 0}.lux-message{display:flex;gap:8px;align-items:flex-start;padding:6px 2px}.lux-message>b,.lux-message div>b{color:#e5c96c;font-size:10px}.lux-message p{margin:3px 0;padding:8px 10px;border-radius:12px;background:#130e06;color:#e9dfc4;font-size:11px}.lux-quick{display:flex;gap:5px;overflow:auto;padding:7px 0}.lux-quick button{white-space:nowrap;border:1px solid rgba(221,187,81,.2);background:#120d05;color:#dfcf9b;border-radius:999px;padding:7px 9px;font-size:9px}.lux-compose{display:flex;gap:6px}.lux-compose input{flex:1;min-width:0;border:1px solid rgba(221,187,81,.38);background:#080705;color:white;border-radius:13px;padding:11px;outline:none}.lux-compose button{width:45px;border:0;border-radius:13px;background:linear-gradient(145deg,#f0d36d,#9c7419);color:#140d02;font-size:18px}.lux-profile-sheet{padding:18px;position:relative}.lux-close{position:absolute;right:13px;top:13px}.lux-profile-hero{text-align:center;padding:12px 0 20px}.lux-profile-hero>div{margin:auto}.lux-profile-hero h2{margin:10px 0 4px;font-family:Georgia,serif;color:#f2d67a}.lux-profile-hero small{font-size:9px;letter-spacing:1px;color:#958760}.lux-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.lux-profile-grid div{padding:12px;border:1px solid rgba(221,187,81,.2);border-radius:13px;background:rgba(255,255,255,.025)}.lux-profile-grid b{display:block;color:#f0d36d;font-size:10px}.lux-profile-grid small{display:block;color:#817653;font-size:8px;margin-top:4px}
      .ig-avatar.voice-speaking{border-radius:50%;box-shadow:0 0 0 2px rgba(245,215,110,.72),0 0 16px rgba(245,190,45,.95),0 0 30px rgba(245,190,45,.55)!important;animation:ludoGoldVoicePulse 900ms ease-in-out infinite}.ig-avatar.voice-speaking:after{content:"";position:absolute;inset:-5px;border:2px solid rgba(245,210,90,.5);border-radius:50%;animation:ludoGoldVoiceRing 900ms ease-out infinite;pointer-events:none}@keyframes ludoGoldVoicePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}@keyframes ludoGoldVoiceRing{0%{transform:scale(.92);opacity:.85}100%{transform:scale(1.25);opacity:0}}
      @media(max-width:520px){.lux-shell{grid-template-rows:54px minmax(0,1fr) 96px 40px;padding:5px;gap:5px}.lux-header{border-radius:17px}.lux-logo{display:none}.lux-menu{display:none}.lux-player{min-width:126px}.lux-board-frame{width:min(calc(100vw - 10px),calc(100dvh - 165px));padding:3px;border-radius:21px}.lux-control-zone{grid-template-columns:1fr 1.35fr 62px}.lux-profile-card{padding:5px}.lux-card-avatar{transform:scale(.88)}.lux-turn-card{padding:5px}.lux-turn-card small{max-width:85px}.lux-dice{height:76px}.lux-dice button{transform:scale(.56)}.lux-comm-stack{gap:4px}.lux-tools button{padding:6px 7px}.lux-tools button span{display:none}.lux-room{font-size:7px}}
      @media(max-height:650px){.lux-shell{grid-template-rows:48px minmax(0,1fr) 78px 36px}.lux-player{min-width:112px;padding:4px 6px}.lux-player-copy small{display:none}.lux-board-frame{width:min(calc(100vw - 10px),calc(100dvh - 138px))}.lux-control-zone{grid-template-columns:1fr 1.4fr 58px}.lux-profile-card small{display:none}.lux-dice{height:64px}}
    `}</style>
  </main>;
}
