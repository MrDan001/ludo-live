"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import LudoBoard, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import ChatVoice from "../_components/ChatVoice";
import { canMove, nextProgress, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats } from "../../lib/ludoRules";

export const dynamic = "force-dynamic";

type Color = "red" | "yellow" | "green" | "blue";
type Player = { playerId: string; name: string; seat: number; colors?: Color[]; level?: number; avatar?: string; coins?: number };
type TokenMap = Record<string, Record<string, { position: number }>>;
type GameState = { status: string; currentPlayerId: string | null; dice: DiceValue | null; pendingMove: DiceValue | null; players: Player[]; tokens: TokenMap; winnerId?: string | null; stateRevision?: number };

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;
const initialTokens = (): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const normalizeTokens = (serverTokens: TokenMap): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => { const raw = serverTokens?.[color]?.[String(id)]?.position; const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0; return { color, id, position, state: position === 0 ? ("yard" as const) : position === FINISH ? ("finished" as const) : position > 51 ? ("home" as const) : ("track" as const) }; }));

function PlayerAvatar({ src, fallback }: { src?: string; fallback: string }) {
  if (src && (src.startsWith("http") || src.startsWith("/") || src.startsWith("data:"))) return <img src={src} alt="Avatar" />;
  return <span>{src || fallback}</span>;
}

const QUICK_REACTIONS = ["👋 Hi!", "😂 LOL", "🔥 Nice!", "👍 Good move", "🏆 GG", "😜"];

function GameContent() {
  const params = useSearchParams();
  const [theme] = useState<BoardThemeId>("classic");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState("");
  const [myName, setMyName] = useState("");
  const [myAvatarUrl, setMyAvatarUrl] = useState("");
  const [myLevel, setMyLevel] = useState(1);
  const [myCoins, setMyCoins] = useState(0);
  const [game, setGame] = useState<GameState | null>(null);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [roll, setRoll] = useState<DiceValue>(6);
  const [pending, setPending] = useState<DiceValue | null>(null);
  const [remoteRolling, setRemoteRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; name: string; text: string; at: number }>>([]);
  const [roomCode, setRoomCode] = useState("W100NB");
  const diceTimer = useRef<number | null>(null);
  const revisionRef = useRef(-1);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("ludo-settings") || "{}"); if (saved.sound !== undefined) setSoundEnabled(saved.sound !== false); } catch {}
  }, []);
  useEffect(() => { const room = params.get("room"); if (room) setRoomCode(room); }, [params]);

  const players = useMemo(() => {
    if (game?.players?.length) return game.players.map((p) => String(p.playerId) === String(me) ? { ...p, name: p.name || myName, level: Number(p.level) > 0 ? Number(p.level) : myLevel, avatar: p.avatar || myAvatarUrl, coins: Number.isFinite(Number(p.coins)) ? Number(p.coins) : myCoins } : p);
    return myName ? [{ playerId: me || "1", name: myName, level: myLevel, avatar: myAvatarUrl, coins: myCoins, seat: 0 }] : [];
  }, [game?.players, me, myName, myAvatarUrl, myLevel, myCoins]);

  const mine = players.find((p) => String(p.playerId) === String(me)) || players[0];
  const opponent = players.find((p) => String(p.playerId) !== String(mine?.playerId));
  const myColors = useMemo<Color[]>(() => mine?.colors?.length ? mine.colors : (playerColorsForSeats(players.length === 2 ? 2 : 4, mine?.seat ?? 0) as Color[]), [mine, players.length]);
  const myTurn = game ? String(game.currentPlayerId || "") === String(me) : true;
  const legalTokenKeys = useMemo(() => pending === null || !myTurn ? [] : tokens.filter((t) => myColors.includes(t.color) && canMove(tokens, t, pending)).map((t) => `${t.color}:${t.id}`), [pending, myTurn, tokens, myColors]);

  const applyState = useCallback((next: GameState) => {
    const r = Number(next.stateRevision ?? -1);
    if (r >= 0 && revisionRef.current >= 0 && r < revisionRef.current) return false;
    if (r >= 0) revisionRef.current = r;
    setGame(next);
    setTokens(normalizeTokens(next.tokens || {}));
    return true;
  }, []);

  useEffect(() => {
    let mounted = true;
    let localSocket: Socket | null = null;
    const connect = async () => {
      let playerId = "", profileName = "", profileAvatar = "";
      let profileLevel = 1, profileCoins = 0;
      try {
        const [authResponse, customizationResponse] = await Promise.all([fetch("/api/auth", { cache: "no-store" }), fetch("/api/customization", { cache: "no-store" })]);
        const d = await authResponse.json();
        const customization = customizationResponse.ok ? await customizationResponse.json() : null;
        playerId = String(d?.user?.id || "");
        profileName = String(d?.user?.username || "");
        profileAvatar = String(d?.user?.avatar || d?.user?.image || "");
        profileLevel = Math.max(1, Number(d?.user?.level) || 1);
        profileCoins = Math.max(0, Number(d?.user?.coins) || 0);
        const equippedId = String(customization?.equippedAvatar || "");
        const equipped = Array.isArray(customization?.avatars) ? customization.avatars.find((a: { id?: string }) => a.id === equippedId) : null;
        if (equipped?.imageUrl || equipped?.icon) profileAvatar = String(equipped.imageUrl || equipped.icon);
      } catch {}
      if (!mounted) return;
      setMe(playerId); setMyName(profileName); setMyLevel(profileLevel); setMyCoins(profileCoins); setMyAvatarUrl(profileAvatar);
      const room = params.get("room") || roomCode;
      const roomSize = Number(params.get("size") || 2);
      localSocket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true });
      setSocket(localSocket);
      localSocket.on("connect", () => { if (room && playerId) localSocket?.emit("join-room", { roomCode: room, name: profileName, avatar: profileAvatar, level: profileLevel, coins: profileCoins, roomSize, playerId }); });
      localSocket.on("roster", (members: Player[]) => setGame((g) => g ? { ...g, players: members } : { status: "waiting", currentPlayerId: null, dice: null, pendingMove: null, players: members, tokens: {} }));
      localSocket.on("game-dice", (e: { value: DiceValue }) => { setRoll(e.value); setRemoteRolling(true); if (diceTimer.current) window.clearTimeout(diceTimer.current); diceTimer.current = window.setTimeout(() => setRemoteRolling(false), 900); });
      localSocket.on("chat", (message: { id?: string; name?: string; text?: string; at?: number }) => {
        if (!mounted || !message?.text) return;
        const id = String(message.id || ""), name = String(message.name || "Player"), text = String(message.text), at = Number(message.at || Date.now());
        setChatMessages((items) => { if (id && items.some((item) => item.id === id)) return items; const duplicate = items.find((item) => item.id.startsWith("local-") && item.name === name && item.text === text && Math.abs(item.at - at) < 5000); return duplicate ? items : [...items.slice(-99), { id: id || `remote-${at}`, name, text, at }]; });
      });
      localSocket.on("game-state", (next: GameState) => { if (!mounted || !applyState(next)) return; if (next.dice !== null) setRoll(next.dice); setPending(next.currentPlayerId === playerId ? next.pendingMove : null); setAnimating(false); });
    };
    void connect();
    return () => { mounted = false; if (diceTimer.current) window.clearTimeout(diceTimer.current); localSocket?.disconnect(); };
  }, [applyState, roomCode, params]);

  useEffect(() => {
    if (!socket || !game || !myTurn || pending === null || animating) return;
    if (!tokens.some((t) => myColors.includes(t.color) && canMove(tokens, t, pending))) { setAnimating(true); socket.emit("game-move", { tokenId: "__skip__" }); }
  }, [socket, game, myTurn, pending, animating, tokens, myColors]);

  const chooseToken = useCallback((color: Color, id: number) => {
    if (!socket || !game || !myTurn || pending === null || animating) return;
    const token = tokens.find((t) => t.color === color && t.id === id);
    if (!token || !myColors.includes(color) || !canMove(tokens, token, pending)) return;
    const target = nextProgress(token.position, pending); if (target === null) return;
    setPending(null); setAnimating(true); socket.emit("game-move", { tokenId: `${color}:${id}`, to: target });
  }, [socket, game, myTurn, pending, animating, tokens, myColors]);

  const handleRoll = useCallback(() => {
    if (!socket || !game) { setRoll((Math.floor(Math.random() * 6) + 1) as DiceValue); return; }
    if (!myTurn || pending !== null || animating || remoteRolling) return;
    socket.emit("game-roll");
  }, [socket, game, myTurn, pending, animating, remoteRolling]);

  const sendQuickReaction = (text: string) => { setChatText(text); setChatOpen(true); };
  const sendChatMessage = () => { const text = chatText.trim(); if (!text || !socket?.connected) return; const now = Date.now(); setChatMessages((items) => [...items.slice(-99), { id: `local-${now}`, name: mine?.name || myName || "Player", text, at: now }]); socket.emit("chat", { text }); setChatText(""); };
  const toggleSound = () => { const next = !soundEnabled; setSoundEnabled(next); try { const saved = JSON.parse(localStorage.getItem("ludo-settings") || "{}"); localStorage.setItem("ludo-settings", JSON.stringify({ ...saved, sound: next })); } catch {} window.dispatchEvent(new CustomEvent("ludo-settings-updated", { detail: { sound: next } })); };
  const leaveRoom = () => { if (!window.confirm("Are you sure you want to leave this match?")) return; try { localStorage.removeItem("ludo-room"); } catch {} if (!socket?.connected) { window.location.href = "/lobby"; return; } const go = () => { window.location.href = "/lobby"; }; socket.once("room-left", go); socket.emit("leave-room"); window.setTimeout(go, 900); };

  return <main className="ll-rebuilt-page">
    <div className="ll-rebuilt-shell">
      <header className="ll-topbar">
        <div className="ll-player-card ll-player-you">
          <div className="ll-top-avatar"><PlayerAvatar src={mine?.avatar} fallback="👤" /></div>
          <div className="ll-player-copy"><div className="ll-player-name"><strong>{mine?.name || myName || "Player"}</strong><span>YOU</span></div><div className="ll-player-status"><i />{myTurn ? "Your Turn" : "Waiting"}</div></div>
          <b className="ll-level">★ {mine?.level || myLevel}</b>
        </div>
        <div className="ll-logo"><span>♛</span><strong>LUDO</strong><small>LIVE</small></div>
        <div className="ll-player-card ll-player-opponent">
          <div className="ll-top-avatar"><PlayerAvatar src={opponent?.avatar} fallback="👤" /></div>
          <div className="ll-player-copy"><div className="ll-player-name"><strong>{opponent?.name || ""}</strong></div><div className={`ll-player-status ${opponent ? "opponent-in" : "waiting"}`}><i />{opponent ? "IN MATCH" : "WAITING"}</div></div>
          {opponent && <b className="ll-level">★ {opponent.level || 1}</b>}
        </div>
      </header>

      <section className="ll-board-stage">
        <div className="ll-board-frame"><LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound /></div>
      </section>

      <section className="ll-hud">
        <div className="ll-main-controls">
          <div className="ll-profile-card">
            <div className="ll-profile-head"><div className="ll-profile-avatar"><PlayerAvatar src={mine?.avatar} fallback="👤" /></div><div className="ll-profile-text"><strong>{mine?.name || myName || "Player"}</strong><span>★ {mine?.level || myLevel}</span></div><em>✎</em></div>
            <div className="ll-coins"><span>🟡</span><b>{(mine?.coins ?? myCoins).toLocaleString()}</b></div>
          </div>

          <div className="ll-dice-card">
            <div className="ll-turn-copy"><strong><i />{myTurn ? "YOUR TURN" : "OPPONENT'S TURN"}</strong><span>{myTurn ? <>Roll the dice and<br />make your move</> : <>Wait for the other<br />player to move</>}</span></div>
            <div className="ll-dice-slot"><DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn || pending !== null || animating || remoteRolling} botRolling={remoteRolling} /></div>
          </div>

          <div className="ll-action-stack">
            <button type="button" onClick={() => setChatOpen((v) => !v)}><b>•••</b><span>Chat</span></button>
            <div className="ll-mic"><ChatVoice socket={socket} roomCode={roomCode} playerId={me} members={players.map((p) => ({ id: p.playerId, playerId: p.playerId, name: p.name, online: true }))} /></div>
          </div>
        </div>

        <div className="ll-reactions">{QUICK_REACTIONS.map((text, i) => <button type="button" key={i} onClick={() => sendQuickReaction(text)}>{text}</button>)}</div>
        <footer className="ll-footer"><button type="button" className="leave" onClick={leaveRoom}>↪ Leave Match</button><button type="button" onClick={() => setPlayersOpen((v) => !v)}>👥 Players</button><button type="button" onClick={toggleSound}>{soundEnabled ? "🔊 Sound" : "🔇 Sound"}</button><div className="ll-room">🛡️ <span>Room ID: {roomCode}</span> ▢</div></footer>
      </section>

      {chatOpen && <section className="ll-overlay" role="dialog" aria-label="Room chat"><div className="ll-overlay-head"><b>Room Chat</b><button type="button" onClick={() => setChatOpen(false)}>×</button></div><div className="ll-chat-list">{chatMessages.length ? chatMessages.map((m) => <div className={m.id.startsWith("local-") || m.name === mine?.name ? "mine" : ""} key={`${m.id}-${m.at}`}><b>{m.name}</b><span>{m.text}</span></div>) : <p>No messages yet. Say hello!</p>}</div><form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}><input value={chatText} onChange={(e) => setChatText(e.target.value)} maxLength={240} placeholder="Type a message…"/><button type="submit">Send</button></form></section>}
      {playersOpen && <section className="ll-overlay ll-players" role="dialog" aria-label="Players in room"><div className="ll-overlay-head"><b>Players in Room</b><button type="button" onClick={() => setPlayersOpen(false)}>×</button></div>{players.map((p) => <div className="ll-player-row" key={p.playerId}><div><PlayerAvatar src={p.avatar} fallback="👤" /></div><span><b>{p.name}</b><small>★ {p.level || 1} · {String(p.playerId) === String(me) ? "You" : "In match"}</small></span></div>)}</section>}
    </div>

    <style jsx global>{`
      html,body{margin:0!important;padding:0!important;width:100%;height:100%;overflow:hidden!important;background:#000!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
      *{box-sizing:border-box}
      .ll-rebuilt-page{position:fixed;inset:0;width:100%;height:100dvh;overflow:hidden;background:#000;color:#fff}
      .ll-rebuilt-shell{width:100%;height:100%;display:grid;grid-template-rows:76px minmax(0,1fr) auto;overflow:hidden;padding:4px 10px 6px}
      .ll-topbar{height:72px;display:grid;grid-template-columns:minmax(0,1fr) 94px minmax(0,1fr);align-items:center;gap:7px;min-width:0}
      .ll-player-card{position:relative;height:62px;min-width:0;display:flex;align-items:center;gap:7px;padding:6px 9px;border:1px solid rgba(111,82,28,.9);border-radius:22px;background:linear-gradient(145deg,#151007,#060605);box-shadow:inset 0 1px rgba(255,255,255,.04),0 8px 20px rgba(0,0,0,.45)}
      .ll-top-avatar{width:46px;height:46px;flex:0 0 46px;border-radius:50%;overflow:hidden;display:grid;place-items:center;border:2px solid #d4af37;background:#090806;font-size:19px}.ll-top-avatar img,.ll-profile-avatar img,.ll-player-row img{width:100%;height:100%;object-fit:cover}
      .ll-player-copy{min-width:0;flex:1}.ll-player-name{display:flex;align-items:center;gap:4px;min-width:0}.ll-player-name strong{font-size:10px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ll-player-name span{font-size:6px;font-weight:1000;padding:2px 4px;border-radius:5px;background:#e9ad23;color:#160f02}.ll-player-status{display:flex;align-items:center;gap:4px;margin-top:4px;font-size:7px;font-weight:850;color:#25e975}.ll-player-status i{width:7px;height:7px;border-radius:50%;background:#19e86d;box-shadow:0 0 9px #19e86d}.ll-player-status.opponent-in{color:#ff3347}.ll-player-status.opponent-in i{background:#ff2941;box-shadow:0 0 9px #ff2941}.ll-player-status.waiting{color:#ff3347}.ll-level{position:absolute;left:31px;bottom:-9px;min-width:38px;padding:2px 5px;border:1px solid #a97918;border-radius:12px;background:#090806;color:#f1ca51;text-align:center;font-size:8px}.ll-logo{width:94px;height:68px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f5cf61;text-align:center;filter:drop-shadow(0 0 8px rgba(212,175,55,.3))}.ll-logo span{font-size:20px;line-height:.7}.ll-logo strong{font-family:Georgia,serif;font-size:22px;line-height:.95;text-shadow:0 2px #6d4500}.ll-logo small{font-size:11px;font-weight:1000;letter-spacing:1px;color:#e9b52e}
      .ll-board-stage{min-width:0;min-height:0;width:100%;height:100%;display:grid;place-items:center;overflow:hidden;padding:2px 0}.ll-board-frame{width:min(100%,calc(100dvh - 270px));height:auto;aspect-ratio:1/1;max-width:680px;max-height:100%;min-width:0;min-height:0;padding:6px;border-radius:25px;background:linear-gradient(145deg,#f6da82,#8d6819 43%,#e7c970);box-shadow:0 12px 32px rgba(0,0,0,.8),0 0 0 1px rgba(212,175,55,.35);overflow:hidden}.ll-board-frame>.mp-board-wrap{width:100%!important;height:100%!important;aspect-ratio:1/1!important}.ll-board-frame>.mp-board-wrap>div:first-child{width:100%!important;height:100%!important}
      .ll-hud{width:100%;display:flex;flex-direction:column;gap:5px;min-width:0;overflow:hidden}.ll-main-controls{height:140px;min-height:140px;display:grid;grid-template-columns:minmax(105px,.78fr) minmax(0,1.52fr) 52px;gap:5px;min-width:0}.ll-profile-card,.ll-dice-card,.ll-action-stack button,.ll-mic{border:1px solid rgba(80,62,27,.72);background:linear-gradient(145deg,#17120b,#070705);box-shadow:inset 0 1px rgba(255,255,255,.03),0 8px 20px rgba(0,0,0,.4);border-radius:14px}.ll-profile-card{padding:7px;display:flex;flex-direction:column;justify-content:space-between;min-width:0}.ll-profile-head{display:flex;align-items:center;gap:6px;min-width:0}.ll-profile-avatar{width:41px;height:41px;flex:0 0 41px;border-radius:50%;overflow:hidden;display:grid;place-items:center;border:1.5px solid #d4af37;background:#21190e;font-size:17px}.ll-profile-text{min-width:0}.ll-profile-text strong{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ll-profile-text span{display:block;margin-top:2px;color:#d4af37;font-size:8px;font-weight:850}.ll-profile-head em{margin-left:auto;color:#d4af37;font-size:11px;font-style:normal}.ll-coins{height:29px;display:flex;align-items:center;gap:5px;padding:4px 7px;border:1px solid #302513;border-radius:18px;background:#090806}.ll-coins span{font-size:14px}.ll-coins b{font-size:11px}
      .ll-dice-card{min-width:0;display:grid;grid-template-columns:minmax(0,1fr) 98px;gap:2px;padding:6px;overflow:hidden}.ll-turn-copy{min-width:0;padding:4px 0 0 3px;overflow:hidden}.ll-turn-copy strong{display:flex;align-items:center;gap:4px;color:#39e87a;font-size:9px;white-space:nowrap}.ll-turn-copy strong i{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px #4ade80}.ll-turn-copy>span{display:block;margin-top:5px;color:#777;font-size:8px;line-height:1.25}.ll-dice-slot{width:98px;min-width:98px;max-width:98px;height:100%;min-height:0;display:flex;align-items:center;justify-content:center;overflow:visible}.ll-dice-slot .dice-area{width:98px!important;min-width:98px!important;max-width:98px!important;transform:none!important;margin:0!important;gap:2px!important}.ll-dice-slot .dice-button{width:92px!important;height:88px!important}.ll-dice-slot .cube-wrap{width:70px!important;height:70px!important}.ll-dice-slot .cube{width:70px!important;height:70px!important}.ll-dice-slot .face{width:70px!important;height:70px!important;padding:7px!important}.ll-dice-slot .face b{width:10px!important;height:10px!important}.ll-dice-slot .front{transform:translateZ(35px)!important}.ll-dice-slot .back{transform:rotateY(180deg) translateZ(35px)!important}.ll-dice-slot .right{transform:rotateY(90deg) translateZ(35px)!important}.ll-dice-slot .left{transform:rotateY(-90deg) translateZ(35px)!important}.ll-dice-slot .top{transform:rotateX(90deg) translateZ(35px)!important}.ll-dice-slot .bottom{transform:rotateX(-90deg) translateZ(35px)!important}.ll-dice-slot .dice-value{font-size:13px!important;min-height:16px!important}.ll-dice-slot .dice-hint{width:92px!important;font-size:6px!important;margin-top:0!important;white-space:nowrap;text-align:center}.ll-action-stack{display:flex;flex-direction:column;gap:5px;min-width:0}.ll-action-stack button,.ll-mic{width:52px;height:67.5px;min-height:67.5px;padding:3px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#fff;cursor:pointer}.ll-action-stack button b{font-size:14px;color:#f2dfaa}.ll-action-stack button span{font-size:8px;color:#d0c6ae;font-weight:750}.ll-mic{padding:0!important;overflow:hidden}.ll-mic>div,.ll-mic button{width:100%!important;height:100%!important}.ll-mic button{border:0!important;border-radius:13px!important;font-size:8px!important;padding:2px!important}
      .ll-reactions{height:27px;min-height:27px;display:flex;gap:4px;overflow:hidden}.ll-reactions button{height:27px;flex:0 0 auto;padding:4px 8px;border:1px solid #3a2d16;border-radius:14px;background:#100d08;color:#f0d477;font-size:7px;font-weight:800;white-space:nowrap}.ll-footer{height:28px;min-height:28px;display:grid;grid-template-columns:auto auto auto minmax(0,1fr);gap:4px;align-items:center}.ll-footer button,.ll-room{height:28px;min-width:0;padding:4px 7px;border:1px solid #3a2d16;border-radius:10px;background:#100d08;color:#cfc6b0;font-size:7px;font-weight:800;white-space:nowrap;overflow:hidden}.ll-footer .leave{color:#ef5555}.ll-room{display:flex;align-items:center;justify-content:center;gap:4px;color:#858585}.ll-room span{overflow:hidden;text-overflow:ellipsis}
      .ll-overlay{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:200;width:min(92%,420px);max-height:70%;display:flex;flex-direction:column;padding:13px;border:1px solid rgba(212,175,55,.55);border-radius:18px;background:#0d0a06;box-shadow:0 18px 60px rgba(0,0,0,.85);color:#f4e6b1}.ll-overlay-head{display:flex;justify-content:space-between;align-items:center;padding-bottom:9px;border-bottom:1px solid rgba(212,175,55,.2)}.ll-overlay-head button{border:0;background:transparent;color:#f1d878;font-size:24px}.ll-chat-list{flex:1;min-height:120px;overflow:auto;padding:9px 2px;display:flex;flex-direction:column;gap:7px}.ll-chat-list>div{align-self:flex-start;max-width:85%;display:flex;flex-direction:column;gap:2px;padding:7px 9px;border-radius:11px;background:#20170b}.ll-chat-list>div.mine{align-self:flex-end;background:#12351e}.ll-chat-list b{font-size:9px;color:#e5bd4d}.ll-chat-list span{font-size:12px;color:#fff}.ll-chat-list p{margin:auto;color:#999;font-size:11px}.ll-overlay form{display:flex;gap:6px;border-top:1px solid rgba(212,175,55,.2);padding-top:9px}.ll-overlay input{flex:1;min-width:0;background:#080705;color:#fff;border:1px solid rgba(212,175,55,.35);border-radius:9px;padding:8px}.ll-overlay form button{border:1px solid #b88d28;border-radius:9px;background:#c7951c;color:#100d06;font-weight:900;padding:0 11px}.ll-player-row{display:flex;align-items:center;gap:9px;padding:8px;margin-top:7px;border-radius:11px;background:#100d08}.ll-player-row>div{width:38px;height:38px;border-radius:50%;overflow:hidden;border:2px solid #b88d28}.ll-player-row span{min-width:0}.ll-player-row b,.ll-player-row small{display:block}.ll-player-row b{font-size:12px}.ll-player-row small{margin-top:2px;color:#76ef9e;font-size:9px}
      @media(min-width:701px){.ll-rebuilt-shell{padding:12px 20px 14px;grid-template-rows:94px minmax(0,1fr) auto}.ll-topbar{height:86px;grid-template-columns:minmax(0,1fr) 130px minmax(0,1fr)}.ll-player-card{height:76px}.ll-top-avatar{width:55px;height:55px;flex-basis:55px}.ll-player-name strong{font-size:14px}.ll-player-status{font-size:10px}.ll-logo{width:130px;height:80px}.ll-logo strong{font-size:29px}.ll-logo small{font-size:14px}.ll-board-frame{width:min(100%,calc(100dvh - 330px));max-width:620px}.ll-main-controls{height:150px;min-height:150px;grid-template-columns:minmax(160px,.82fr) minmax(280px,1.5fr) 76px;gap:8px}.ll-profile-card,.ll-dice-card,.ll-action-stack button,.ll-mic{border-radius:17px}.ll-profile-card{padding:11px}.ll-profile-avatar{width:48px;height:48px;flex-basis:48px}.ll-profile-text strong{font-size:13px}.ll-profile-text span{font-size:10px}.ll-coins{height:36px}.ll-coins b{font-size:14px}.ll-dice-card{grid-template-columns:minmax(0,1fr) 120px;padding:10px}.ll-dice-slot{width:120px;min-width:120px;max-width:120px}.ll-dice-slot .dice-area{width:120px!important;min-width:120px!important;max-width:120px!important}.ll-dice-slot .dice-button{width:110px!important;height:105px!important}.ll-dice-slot .cube-wrap,.ll-dice-slot .cube,.ll-dice-slot .face{width:78px!important;height:78px!important}.ll-dice-slot .front{transform:translateZ(39px)!important}.ll-dice-slot .back{transform:rotateY(180deg) translateZ(39px)!important}.ll-dice-slot .right{transform:rotateY(90deg) translateZ(39px)!important}.ll-dice-slot .left{transform:rotateY(-90deg) translateZ(39px)!important}.ll-dice-slot .top{transform:rotateX(90deg) translateZ(39px)!important}.ll-dice-slot .bottom{transform:rotateX(-90deg) translateZ(39px)!important}.ll-action-stack{gap:8px}.ll-action-stack button,.ll-mic{width:76px;height:71px;min-height:71px}.ll-reactions{height:34px;min-height:34px}.ll-reactions button{height:34px;font-size:10px;padding:7px 12px}.ll-footer,.ll-footer button,.ll-room{height:34px;min-height:34px;font-size:9px}.ll-footer{gap:7px}}
      @media(max-height:700px) and (max-width:700px){.ll-rebuilt-shell{grid-template-rows:66px minmax(0,1fr) auto;padding-top:2px}.ll-topbar{height:64px}.ll-player-card{height:54px}.ll-top-avatar{width:39px;height:39px;flex-basis:39px}.ll-logo{height:58px}.ll-board-frame{width:min(100%,calc(100dvh - 235px))}.ll-main-controls{height:118px;min-height:118px}.ll-action-stack button,.ll-mic{height:56.5px;min-height:56.5px}.ll-dice-slot .dice-button{height:76px!important}.ll-dice-slot .cube-wrap,.ll-dice-slot .cube,.ll-dice-slot .face{width:62px!important;height:62px!important}.ll-dice-slot .front{transform:translateZ(31px)!important}.ll-dice-slot .back{transform:rotateY(180deg) translateZ(31px)!important}.ll-dice-slot .right{transform:rotateY(90deg) translateZ(31px)!important}.ll-dice-slot .left{transform:rotateY(-90deg) translateZ(31px)!important}.ll-dice-slot .top{transform:rotateX(90deg) translateZ(31px)!important}.ll-dice-slot .bottom{transform:rotateX(-90deg) translateZ(31px)!important}}
    `}</style>
  </main>;
}

export default function OnlineGamePage() {
  return <Suspense fallback={<div style={{ background: "#000", height: "100vh" }} />}><GameContent /></Suspense>;
}
