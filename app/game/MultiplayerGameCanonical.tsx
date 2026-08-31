"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import LudoBoard, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import { canMove, hasLegalMove, nextProgress, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats } from "../../lib/ludoRules";
import { BOARD_PALETTES } from "../_components/LudoBoardMultiplayer";

type Color = "red" | "yellow" | "green" | "blue";
type Player = { 
  playerId: string; 
  name: string; 
  seat: number; 
  host?: boolean; 
  ready?: boolean; 
  connected?: boolean; 
  colors?: Color[]; 
  board?: string; 
  level?: number; 
  avatar?: string 
};
type TokenMap = Record<string, Record<string, { position: number }>>;
type GameState = { 
  status: string; 
  currentPlayerId: string | null; 
  dice: DiceValue | null; 
  pendingMove: DiceValue | null; 
  sixStreak: number; 
  players: Player[]; 
  tokens: TokenMap; 
  winnerId?: string | null; 
  stateRevision?: number; 
  startedAt?: number 
};
type ChatMessage = { id: string; name: string; text: string; at: number };

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;
const initialTokens = (): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const displayTheme = (value: string): BoardThemeId => value === "midnight-live" ? "night" : value in BOARD_PALETTES ? (value as BoardThemeId) : "classic";
const normalizeTokens = (serverTokens: TokenMap): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => { 
  const raw = serverTokens?.[color]?.[String(id)]?.position; 
  const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0; 
  return { color, id, position, state: position === 0 ? ("yard" as const) : position === FINISH ? ("finished" as const) : position > 51 ? ("home" as const) : ("track" as const) }; 
}));
const audioEvent = (kind: "dice" | "win") => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind })); };

export default function MultiplayerGameCanonical() {
  const [theme, setTheme] = useState<BoardThemeId>("classic");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [me, setMe] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [tokens, setTokens] = useState<DemoToken[]>(initialTokens);
  const [roll, setRoll] = useState<DiceValue>(1);
  const [pending, setPending] = useState<DiceValue | null>(null);
  const [remoteRolling, setRemoteRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [notice, setNotice] = useState("Connecting to live match…");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [muted, setMuted] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [isTournament, setIsTournament] = useState(false);

  const diceTimer = useRef<number | null>(null);
  const moveTimer = useRef<number | null>(null);
  const winnerRef = useRef<string | null>(null);
  const revisionRef = useRef(-1);

  // Safe parameters extraction inside client environment
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setRoomCode(params.get("room") || "");
      setIsTournament(params.has("tournament"));
    }
  }, []);

  const players = useMemo(() => {
    if (game?.players?.length) return game.players;
    return [
      { playerId: me || "me", name: "You", level: 1, avatar: "🦁", seat: 0 },
      { playerId: "opponent", name: "Waiting...", level: 1, avatar: "🐼", seat: 1 }
    ];
  }, [game?.players, me]);

  const mine = players.find((p) => String(p.playerId) === String(me));
  const myColors = useMemo<Color[]>(
    () => (mine?.colors?.length ? mine.colors : (playerColorsForSeats(players.length === 2 ? 2 : 4, mine?.seat ?? 0) as Color[])),
    [mine, players.length]
  );
  const myTurn = game ? game.currentPlayerId === me : true;
  const legalTokenKeys = useMemo(
    () => (pending === null || !myTurn ? [] : tokens.filter((t) => myColors.includes(t.color) && canMove(tokens, t, pending)).map((t) => `${t.color}:${t.id}`)),
    [pending, myTurn, tokens, myColors]
  );

  const applyState = useCallback((next: GameState) => { 
    const r = Number(next.stateRevision ?? -1); 
    if (r >= 0 && revisionRef.current >= 0 && r < revisionRef.current) return false; 
    if (r >= 0) revisionRef.current = r; 
    setGame(next); 
    setTokens(normalizeTokens(next.tokens || {})); 
    return true; 
  }, []);

  useEffect(() => { 
    try { 
      const saved = localStorage.getItem("ludo-match-board"); 
      if (saved) setTheme(displayTheme(saved)); 
    } catch {} 
    void fetch("/api/customization", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { 
        const b = String(d?.equippedBoard || ""); 
        if (b) setTheme(displayTheme(b)); 
      })
      .catch(() => {}); 
  }, []);

  useEffect(() => { 
    let mounted = true; 
    let localSocket: Socket | null = null; 
    const connect = async () => { 
      let playerId = "", profileName = "Player"; 
      try { 
        const r = await fetch("/api/auth", { cache: "no-store" }); 
        const d = await r.json(); 
        playerId = String(d?.user?.id || ""); 
        profileName = String(d?.user?.username || "Player"); 
      } catch {} 
      if (!mounted) return;
      if (playerId) setMe(playerId); 

      const params = new URLSearchParams(window.location.search); 
      const room = params.get("room") || ""; 
      const roomSize = Number(params.get("size") || 4); 

      localSocket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 250 }); 
      setSocket(localSocket); 

      localSocket.on("connect", () => { 
        setNotice(params.has("tournament") ? "Tournament match" : "Live multiplayer match"); 
        if (room && playerId) { 
          let board = "classic"; 
          try { board = localStorage.getItem("ludo-match-board") || "classic"; } catch {} 
          localSocket?.emit("join-room", { roomCode: room, name: profileName, roomSize, playerId, board, dice: "classic" }); 
        } 
      }); 
      localSocket.on("roster", (members: Player[]) => { 
        const host = members.find((m) => m.host); 
        if (host?.board) setTheme(displayTheme(String(host.board))); 
        setGame((g) => (g ? { ...g, players: members } : g)); 
      }); 
      localSocket.on("start-game", ({ board }: { board?: string }) => { 
        if (board) setTheme(displayTheme(String(board))); 
        setNotice(params.has("tournament") ? "Tournament match" : "Live multiplayer match"); 
      }); 
      localSocket.on("start-error", (m: string) => setNotice(m)); 
      localSocket.on("game-dice", (e: { value: DiceValue }) => { 
        setRoll(e.value); 
        setRemoteRolling(true); 
        audioEvent("dice"); 
        if (diceTimer.current) window.clearTimeout(diceTimer.current); 
        diceTimer.current = window.setTimeout(() => setRemoteRolling(false), 900); 
      }); 
      localSocket.on("game-state", (next: GameState) => { 
        if (!mounted || !applyState(next)) return; 
        if (next.dice !== null) setRoll(next.dice); 
        setPending(next.currentPlayerId === playerId ? next.pendingMove : null); 
        if (next.winnerId && winnerRef.current !== next.winnerId) { 
          winnerRef.current = next.winnerId; 
          audioEvent("win"); 
        } 
        if (next.winnerId) setNotice(next.winnerId === playerId ? "You won!" : `${next.players.find((p) => p.playerId === next.winnerId)?.name || "Player"} won`); 
        else if (next.currentPlayerId === playerId) setNotice(next.pendingMove !== null ? `Pick a token • ${next.pendingMove}` : "Your turn"); 
        else setNotice("Opponent's turn"); 
      }); 
      localSocket.on("game-moved", () => { 
        setAnimating(true); 
        if (moveTimer.current) window.clearTimeout(moveTimer.current); 
        moveTimer.current = window.setTimeout(() => setAnimating(false), 650); 
      }); 
      localSocket.on("chat", (m: ChatMessage) => setMessages((old) => [...old.slice(-49), m])); 
      localSocket.on("disconnect", () => setNotice("Reconnecting…")); 
    }; 
    void connect(); 
    return () => { 
      mounted = false; 
      if (diceTimer.current) window.clearTimeout(diceTimer.current); 
      if (moveTimer.current) window.clearTimeout(moveTimer.current); 
      localSocket?.disconnect(); 
    }; 
  }, [applyState]);

  useEffect(() => { 
    if (!game?.winnerId || !me || isTournament) return; 
    const eventKey = `multiplayer:${roomCode || "room"}:winner:${game.winnerId}`; 
    void fetch("/api/progress", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ source: "game_win", eventKey }) 
    }).catch(() => {}); 
  }, [game?.winnerId, me, isTournament, roomCode]);

  useEffect(() => { 
    if (!socket || !game || !myTurn || pending === null || hasLegalMove(tokens, myColors, pending)) return; 
    setPending(null); 
    socket.emit("game-move", { tokenId: "__skip__", to: 0 }); 
  }, [socket, game, myTurn, pending, tokens, myColors]);

  const chooseToken = useCallback((color: Color, id: number) => { 
    if (!socket || !game || !myTurn || pending === null || animating) return; 
    const token = tokens.find((t) => t.color === color && t.id === id); 
    if (!token || !myColors.includes(color) || !canMove(tokens, token, pending)) return; 
    const target = nextProgress(token.position, pending); 
    if (target === null) return; 
    setPending(null); 
    setAnimating(true); 
    setNotice("Moving…"); 
    socket.emit("game-move", { tokenId: `${color}:${id}`, to: target }); 
  }, [socket, game, myTurn, pending, animating, tokens, myColors]);

  const handleRoll = useCallback(() => { 
    if (!socket || !game) {
      setRoll((Math.floor(Math.random() * 6) + 1) as DiceValue);
      return;
    }
    if (!myTurn || pending !== null || animating || remoteRolling || game.status !== "playing") return; 
    socket.emit("game-roll"); 
  }, [socket, game, myTurn, pending, animating, remoteRolling]);

  const sendChat = useCallback(() => { 
    const text = chatText.trim(); 
    if (!socket || !text) return; 
    socket.emit("chat", { text: text.slice(0, 240) }); 
    setChatText(""); 
  }, [socket, chatText]);

  return (
    <main className="live-page">
      <div className="mp-topbar">
        <div className="match-info">
          <i /> LIVE MATCH {roomCode ? <small>ROOM {roomCode}</small> : null}
        </div>
        <div className="mp-actions">
          <button type="button" onClick={() => setChatOpen((v) => !v)} aria-label="Chat">
            💬{messages.length ? <em>{messages.length}</em> : null}
          </button>
          <button type="button" onClick={() => setMuted((v) => !v)} aria-label="Microphone">
            {muted ? "🔇" : "🎙️"}
          </button>
        </div>
      </div>

      <div className="mp-players">
        {players.slice(0, 4).map((p, i) => { 
          const active = String(p.playerId) === String(me); 
          const turn = game ? String(p.playerId) === String(game.currentPlayerId) : i === 0; 
          return (
            <div className={`mp-player ${active ? "self" : ""} ${turn ? "turn" : ""}`} key={p.playerId || i}>
              <div className="mp-avatar">{p.avatar || ["🦁", "🐯", "🐼", "🦊"][i]}<span /></div>
              <div>
                <b>{p.name || "Player"}{active ? " · You" : ""}</b>
                <small>LEVEL {Number(p.level) || 1}</small>
              </div>
              {turn && <strong>TURN</strong>}
            </div>
          );
        })}
      </div>

      <div className="board-stage">
        <div className="board-wrap">
          <div className="board-frame">
            <LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound />
          </div>
        </div>
      </div>

      <div className="mp-bottom">
        <span>{game?.winnerId ? "🏆 MATCH COMPLETE" : myTurn ? "YOUR TURN" : "OPPONENT'S TURN"}</span>
        <b>{notice}</b>
        <div className="dice-out">
          <DemoDice 
            value={roll} 
            onRoll={handleRoll} 
            disabled={!myTurn || pending !== null || animating || remoteRolling} 
            botRolling={remoteRolling} 
          />
        </div>
      </div>

      {chatOpen && (
        <section className="chat-panel">
          <header>
            <b>Match Chat</b>
            <button type="button" onClick={() => setChatOpen(false)}>×</button>
          </header>
          <div className="chat-list">
            {messages.length ? (
              messages.map((m, i) => (
                <div className={`chat-msg ${String(m.id) === String(me) ? "mine" : ""}`} key={`${m.id}-${m.at}-${i}`}>
                  <b>{m.name}</b>
                  <span>{m.text}</span>
                </div>
              ))
            ) : (
              <p>No messages yet.</p>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); sendChat(); }}>
            <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Type a message…" maxLength={240} />
            <button disabled={!chatText.trim()}>Send</button>
          </form>
        </section>
      )}

      <style jsx global>{`
        html, body { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; overflow: hidden; background: #030303 !important; }
        * { box-sizing: border-box; }
        .live-page { position: fixed; inset: 0; overflow: hidden; background: radial-gradient(circle at 50% 48%, #2a1f0d 0%, #100d08 38%, #070604 72%, #020202 100%); color: #f7edcf; font-family: system-ui, -apple-system, sans-serif; isolation: isolate; }
        .live-page:before, .live-page:after { content: ""; position: absolute; z-index: -1; pointer-events: none; border: 1px solid #d5ac4a18; border-radius: 50%; inset: 9% 12%; box-shadow: 0 0 90px #d5ac4a0b, inset 0 0 80px #0008; }
        .live-page:after { inset: 18% 22%; border-color: #fff2c80b; box-shadow: inset 0 0 70px #0009; }
        
        .board-stage { position: absolute; inset: 0 0 86px 0; z-index: 10; display: grid; place-items: center; padding: 0; }
        .board-wrap { width: min(96vw, 96vh, 760px); height: min(96vw, 96vh, 760px); aspect-ratio: 1/1; }
        .board-frame { width: 100%; height: 100%; padding: 4px; border-radius: 24px; background: linear-gradient(145deg, #f2d573, #704d0b, #d8b34c); box-shadow: 0 20px 55px #000b, 0 0 0 1px #f5d97b33; }
        .board-frame > div { width: 100% !important; height: 100% !important; aspect-ratio: 1/1 !important; border-radius: 20px; overflow: hidden; }
        
        .mp-topbar { position: fixed; z-index: 30; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: max(10px, env(safe-area-inset-top)) 3vw 0 3vw; pointer-events: none; }
        .match-info { padding: 7px 11px; border-radius: 999px; font-size: 9px; font-weight: 900; letter-spacing: 1px; background: #090806d9; border: 1px solid #ffffff18; backdrop-filter: blur(12px); box-shadow: 0 8px 25px #0006; pointer-events: auto; }
        .match-info i { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #40dc7f; margin-right: 6px; }
        .match-info small { color: #aaa; margin-left: 6px; }
        
        .mp-actions { display: flex; gap: 6px; pointer-events: auto; }
        .mp-actions button { width: 38px; height: 36px; border-radius: 12px; color: #fff; font-size: 16px; position: relative; background: #090806ed; border: 1px solid #ffffff18; backdrop-filter: blur(12px); box-shadow: 0 8px 25px #0008; cursor: pointer; }
        .mp-actions em { position: absolute; right: -3px; top: -4px; background: #d8ad43; color: #171006; border-radius: 9px; padding: 2px 4px; font-size: 8px; font-style: normal; }
        
        .mp-players { position: fixed; z-index: 30; top: max(53px, calc(env(safe-area-inset-top) + 53px)); left: 50%; transform: translateX(-50%); width: min(94vw, 1000px); display: flex; justify-content: center; gap: 7px; pointer-events: none; }
        .mp-player { display: flex; align-items: center; gap: 7px; min-width: 135px; padding: 6px 9px; border-radius: 14px; background: #090806e6; border: 1px solid #ffffff18; backdrop-filter: blur(12px); box-shadow: 0 8px 25px #0006; }
        .mp-player.self { border-color: #d9ad4c66; }
        .mp-player.turn { box-shadow: 0 0 0 1px #e4c15b66, 0 8px 25px #0008; }
        .mp-avatar { position: relative; width: 31px; height: 31px; display: grid; place-items: center; border-radius: 50%; background: #211d15; font-size: 17px; }
        .mp-avatar span { position: absolute; right: -1px; bottom: -1px; width: 8px; height: 8px; border-radius: 50%; background: #42df83; border: 2px solid #090806; }
        .mp-player b { display: block; font-size: 9px; max-width: 105px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mp-player small { display: block; font-size: 7px; color: #d4b158; font-weight: 900; margin-top: 2px; }
        .mp-player > strong { font-size: 7px; color: #e2c66c; margin-left: auto; }
        
        .mp-bottom { position: fixed; z-index: 30; bottom: max(10px, env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); width: min(94vw, 1000px); display: flex; align-items: center; justify-content: center; gap: 8px; pointer-events: none; min-height: 44px; }
        .mp-bottom > span, .mp-bottom > b { padding: 6px 10px; border-radius: 999px; font-size: 8px; white-space: nowrap; background: #090806e6; border: 1px solid #ffffff18; backdrop-filter: blur(12px); box-shadow: 0 8px 25px #0006; }
        .mp-bottom > span { color: #e9cc72; font-weight: 900; letter-spacing: 0.4px; }
        .mp-bottom > b { color: #aaa; font-weight: 600; }
        .dice-out { pointer-events: auto; position: absolute; left: 50%; bottom: 42px; transform: translateX(-50%); z-index: 40; }
        
        .chat-panel { position: fixed; z-index: 50; right: 12px; top: 100px; width: min(330px, calc(100vw - 24px)); height: min(430px, 58vh); display: flex; flex-direction: column; border: 1px solid #d3ad5138; border-radius: 18px; background: #0a0908ed; box-shadow: 0 20px 60px #000b; backdrop-filter: blur(18px); }
        .chat-panel header { display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid #ffffff12; }
        .chat-panel header button { background: none; border: 0; color: #aaa; font-size: 20px; cursor: pointer; }
        .chat-list { flex: 1; overflow: auto; padding: 10px; }
        .chat-list p { text-align: center; color: #777; font-size: 10px; margin-top: 80px; }
        .chat-msg { display: flex; flex-direction: column; align-items: flex-start; margin: 7px 0; }
        .chat-msg.mine { align-items: flex-end; }
        .chat-msg b { font-size: 8px; color: #caaa59; }
        .chat-msg span { max-width: 82%; padding: 7px 9px; border-radius: 11px; background: #1a1815; font-size: 10px; }
        .chat-msg.mine span { background: #70551d; }
        .chat-panel form { display: flex; gap: 6px; padding: 9px; border-top: 1px solid #ffffff12; }
        .chat-panel input { flex: 1; min-width: 0; border: 1px solid #ffffff12; border-radius: 10px; background: #151412; color: #fff; padding: 8px; font-size: 10px; }
        .chat-panel form button { border: 0; border-radius: 10px; background: #d0a83e; color: #171108; padding: 0 11px; font-size: 9px; font-weight: 900; cursor: pointer; }
        
        @media (max-width: 700px) {
          .board-stage { inset: 0 0 86px 0; }
          .board-wrap { width: min(96vw, calc(100vh - 110px), 760px); height: min(96vw, calc(100vh - 110px), 760px); }
          .mp-players { width: 96vw; }
          .mp-player { min-width: 0; flex: 1; padding: 5px 6px; }
          .mp-player:nth-child(n+3) { display: none; }
          .mp-player b { max-width: 72px; }
          .mp-bottom > b { display: none; }
          .dice-out { bottom: 46px; }
          .chat-panel { top: 100px; }
        }
        @media (orientation: landscape) {
          .board-stage { inset: 0 85px 0 0; }
          .board-wrap { width: min(92vw, 92vh, 760px); height: min(92vw, 92vh, 760px); }
          .mp-bottom { left: auto; right: 12px; bottom: 50%; transform: translateY(50%); width: 60px; min-height: 0; flex-direction: column; }
          .mp-bottom > span { display: block; text-align: center; padding: 6px 5px; }
          .mp-bottom > b { display: none; }
          .dice-out { position: static; transform: none; }
          .mp-players { top: 48px; }
        }
      `}</style>
    </main>
  );
}
