"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import LudoBoard, { type BoardThemeId, type DemoToken } from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import ChatVoice from "../_components/ChatVoice";
import { canMove, hasLegalMove, nextProgress, FINISH_PROGRESS, type DiceValue } from "../../lib/ludoEngine";
import { playerColorsForSeats } from "../../lib/ludoRules";
import { BOARD_PALETTES } from "../_components/LudoBoardMultiplayer";

type Color = "red" | "yellow" | "green" | "blue";
type Player = { playerId: string; name: string; seat: number; host?: boolean; ready?: boolean; connected?: boolean; colors?: Color[]; board?: string };
type TokenMap = Record<string, Record<string, { position: number }>>;
type GameState = { status: string; currentPlayerId: string | null; dice: DiceValue | null; pendingMove: DiceValue | null; sixStreak: number; players: Player[]; tokens: TokenMap; winnerId?: string | null; stateRevision?: number; startedAt?: number };
type ChatMessage = { id: string; name: string; text: string; at: number };

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;
const initialTokens = (): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => ({ color, id, position: 0, state: "yard" as const })));
const displayTheme = (value: string): BoardThemeId => value === "midnight-live" ? "night" : value in BOARD_PALETTES ? value as BoardThemeId : "classic";
const normalizeTokens = (serverTokens: TokenMap): DemoToken[] => COLORS.flatMap((color) => Array.from({ length: 4 }, (_, id) => { const raw = serverTokens?.[color]?.[String(id)]?.position; const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0; return { color, id, position, state: position === 0 ? "yard" as const : position === FINISH ? "finished" as const : position > 51 ? "home" as const : "track" as const }; }));
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
  const diceTimer = useRef<number | null>(null);
  const moveTimer = useRef<number | null>(null);
  const winnerRef = useRef<string | null>(null);
  const revisionRef = useRef(-1);

  const players = game?.players ?? [];
  const mine = players.find((p) => String(p.playerId) === String(me));
  const myColors = useMemo<Color[]>(() => mine?.colors?.length ? mine.colors : playerColorsForSeats(players.length === 2 ? 2 : 4, mine?.seat ?? 0) as Color[], [mine, players.length]);
  const myTurn = game?.currentPlayerId === me;
  const isTournament = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tournament");
  const roomCode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("room") || "" : "";
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
    try { const saved = localStorage.getItem("ludo-match-board"); if (saved) setTheme(displayTheme(saved)); } catch {}
    void fetch("/api/customization", { cache: "no-store" }).then((r) => r.json()).then((d) => { const b = String(d?.equippedBoard || ""); if (b) setTheme(displayTheme(b)); }).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    let localSocket: Socket | null = null;
    const connect = async () => {
      let playerId = "", profileName = "Player";
      try { const r = await fetch("/api/auth", { cache: "no-store" }); const d = await r.json(); playerId = String(d?.user?.id || ""); profileName = String(d?.user?.username || "Player"); } catch {}
      if (!mounted || !playerId) return;
      setMe(playerId);
      const params = new URLSearchParams(window.location.search);
      const room = params.get("room") || "";
      const roomSize = Number(params.get("size") || 4);
      localSocket = io(window.location.origin, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 250 });
      setSocket(localSocket);
      localSocket.on("connect", () => {
        setNotice(isTournament ? "Tournament match" : "Live multiplayer match");
        if (room) { let board = "classic"; try { board = localStorage.getItem("ludo-match-board") || "classic"; } catch {} localSocket?.emit("join-room", { roomCode: room, name: profileName, roomSize, playerId, board, dice: "classic" }); }
      });
      localSocket.on("roster", (members: Player[]) => { const host = members.find((m) => m.host); if (host?.board) setTheme(displayTheme(String(host.board))); });
      localSocket.on("start-game", ({ board }: { board?: string }) => { if (board) setTheme(displayTheme(String(board))); setNotice(isTournament ? "Tournament match" : "Live multiplayer match"); });
      localSocket.on("start-error", (m: string) => setNotice(m));
      localSocket.on("game-dice", (e: { value: DiceValue }) => { setRoll(e.value); setRemoteRolling(true); audioEvent("dice"); if (diceTimer.current) window.clearTimeout(diceTimer.current); diceTimer.current = window.setTimeout(() => setRemoteRolling(false), 900); });
      localSocket.on("game-state", (next: GameState) => {
        if (!mounted || !applyState(next)) return;
        if (next.dice !== null) setRoll(next.dice);
        setPending(next.currentPlayerId === playerId ? next.pendingMove : null);
        if (next.winnerId && winnerRef.current !== next.winnerId) { winnerRef.current = next.winnerId; audioEvent("win"); }
        if (next.winnerId) setNotice(next.winnerId === playerId ? "You won!" : `${next.players.find((p) => p.playerId === next.winnerId)?.name || "Player"} won`);
        else if (next.currentPlayerId === playerId) setNotice(next.pendingMove !== null ? `Pick a token • ${next.pendingMove}` : "Your turn");
        else setNotice("Opponent's turn");
      });
      localSocket.on("game-moved", () => { setAnimating(true); if (moveTimer.current) window.clearTimeout(moveTimer.current); moveTimer.current = window.setTimeout(() => setAnimating(false), 650); });
      localSocket.on("chat", (m: ChatMessage) => { setMessages((old) => [...old.slice(-49), m]); });
      localSocket.on("disconnect", () => setNotice("Reconnecting…"));
    };
    void connect();
    return () => { mounted = false; if (diceTimer.current) window.clearTimeout(diceTimer.current); if (moveTimer.current) window.clearTimeout(moveTimer.current); localSocket?.disconnect(); };
  }, [applyState, isTournament]);

  useEffect(() => {
    if (!game?.winnerId || !me || isTournament) return;
    const eventKey = `multiplayer:${roomCode || "room"}:winner:${game.winnerId}`;
    void fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "game_win", eventKey }) }).catch(() => {});
  }, [game?.winnerId, me, isTournament, roomCode]);

  useEffect(() => { if (!socket || !game || !myTurn || pending === null || hasLegalMove(tokens, myColors, pending)) return; setPending(null); socket.emit("game-move", { tokenId: "__skip__", to: 0 }); }, [socket, game, myTurn, pending, tokens, myColors]);

  const chooseToken = useCallback((color: Color, id: number) => {
    if (!socket || !game || !myTurn || pending === null || animating) return;
    const token = tokens.find((t) => t.color === color && t.id === id);
    if (!token || !myColors.includes(color) || !canMove(tokens, token, pending)) return;
    const target = nextProgress(token.position, pending); if (target === null) return;
    setPending(null); setAnimating(true); setNotice("Moving…"); socket.emit("game-move", { tokenId: `${color}:${id}`, to: target });
  }, [socket, game, myTurn, pending, animating, tokens, myColors]);

  const handleRoll = useCallback(() => { if (!socket || !game || !myTurn || pending !== null || animating || remoteRolling || game.status !== "playing") return; socket.emit("game-roll"); }, [socket, game, myTurn, pending, animating, remoteRolling]);
  const sendChat = useCallback(() => { const text = chatText.trim(); if (!socket || !text) return; socket.emit("chat", { text: text.slice(0, 240) }); setChatText(""); }, [socket, chatText]);
  const memberProps = players.map((p) => ({ id: p.playerId, playerId: p.playerId, name: p.name, online: true }));

  return <main className="live-page">
    <div className="board-stage">
      <div className="match-badge"><i />{socket?.connected ? "LIVE MATCH" : "CONNECTING"}</div>
      <div className="board-wrap"><div className="board-glow" /><div className="board-frame"><LudoBoard theme={theme} demoTokens={tokens} onTokenClick={chooseToken} legalTokenKeys={legalTokenKeys} animateUpdates finishSound /></div>
        <div className="floating-tools">
          <button className={`tool chat-tool ${chatOpen ? "active" : ""}`} onClick={() => setChatOpen((v) => !v)} aria-label="Open chat">💬<span>{messages.length > 0 ? messages.length : "Chat"}</span></button>
          <div className="tool mic-tool"><ChatVoice roomCode={roomCode} playerId={me} members={memberProps} /></div>
          <div className="dice-float"><DemoDice value={roll} onRoll={handleRoll} disabled={!myTurn || pending !== null || animating || remoteRolling || !game || game.status !== "playing"} botRolling={remoteRolling} /></div>
        </div>
      </div>
      <div className="turn-pill"><b>{game?.winnerId ? "🏆 MATCH COMPLETE" : myTurn ? "YOUR TURN" : "OPPONENT'S TURN"}</b><span>{game?.winnerId ? notice : myTurn && pending !== null ? `Choose a token • ${pending}` : notice}</span></div>
    </div>

    {chatOpen && <section className="chat-panel" aria-label="Match chat">
      <header><div><b>Match Chat</b><small>{players.length} players</small></div><button onClick={() => setChatOpen(false)} aria-label="Close chat">×</button></header>
      <div className="chat-list">{messages.length === 0 ? <div className="empty-chat">No messages yet.<br />Say hello to the room.</div> : messages.map((m, i) => <div className={`chat-msg ${String(m.id) === String(me) ? "mine" : ""}`} key={`${m.id}-${m.at}-${i}`}><b>{m.name}</b><span>{m.text}</span></div>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="chat-input"><input value={chatText} onChange={(e) => setChatText(e.target.value.slice(0, 240))} placeholder="Type a message…" maxLength={240} autoComplete="off" /><button type="submit" disabled={!chatText.trim()}>Send</button></form>
    </section>}

    <style jsx global>{`
      html,body{margin:0!important;padding:0!important;width:100%;height:100%;overflow:hidden;background:#030303!important}*{box-sizing:border-box}
      .live-page{position:fixed;inset:0;background:radial-gradient(circle at 50% 48%,#251b0a 0,#090705 48%,#020202 100%);color:#f7edcf;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
      .board-stage{position:absolute;inset:0;display:grid;place-items:center;padding:8px}
      .board-wrap{position:relative;width:min(96vw,calc(100svh - 26px),760px);height:min(96vw,calc(100svh - 26px),760px);aspect-ratio:1/1;display:grid;place-items:center}
      .board-glow{position:absolute;inset:3%;border-radius:32px;background:radial-gradient(circle,#d5a42e3a 0,#0000 68%);filter:blur(18px)}
      .board-frame{position:relative;width:100%;height:100%;padding:5px;border-radius:28px;background:linear-gradient(145deg,#f2d573,#6d4b0d 30%,#d8b34c 70%,#523506);box-shadow:0 0 0 1px #f5dc8050,0 20px 55px #000b,0 0 35px #c6952a22}
      .board-frame>div{width:100%!important;height:100%!important;aspect-ratio:1/1!important;border-radius:23px;overflow:hidden}
      .match-badge{position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:12;padding:6px 11px;border:1px solid #dfbc5844;border-radius:999px;background:#0b0907dd;color:#d8bf75;font-size:9px;font-weight:900;letter-spacing:1px;backdrop-filter:blur(10px)}.match-badge i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#39df80;margin-right:6px;box-shadow:0 0 9px #39df80}
      .turn-pill{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10;display:flex;align-items:center;gap:7px;max-width:82vw;padding:6px 11px;border:1px solid #dfbc5844;border-radius:999px;background:#0b0907e8;box-shadow:0 8px 28px #0008;white-space:nowrap;overflow:hidden}.turn-pill b{font-size:9px;color:#f1d36d;letter-spacing:.5px}.turn-pill span{font-size:8px;color:#8f856e;overflow:hidden;text-overflow:ellipsis}
      .floating-tools{position:absolute;inset:0;pointer-events:none}.tool,.dice-float{pointer-events:auto}.tool{position:absolute;width:52px;height:52px;border:1px solid #e0bd584f;border-radius:17px;background:#100c07ed;color:#f1d36d;box-shadow:0 8px 22px #0009;backdrop-filter:blur(10px)}.chat-tool{top:12px;right:12px;font-size:20px}.chat-tool span{display:block;font-size:7px;font-weight:900;letter-spacing:.5px;margin-top:-1px}.chat-tool.active{background:#34240b;border-color:#f0cf6c99}.mic-tool{top:12px;left:12px;padding:0;overflow:hidden}.mic-tool>div{width:100%;height:100%}.dice-float{position:absolute;right:10px;bottom:10px;width:70px;height:70px;display:grid;place-items:center}
      .chat-panel{position:fixed;right:12px;top:72px;bottom:58px;width:min(340px,calc(100vw - 24px));z-index:30;display:flex;flex-direction:column;border:1px solid #e1bd5b55;border-radius:22px;background:#090705f5;box-shadow:0 20px 60px #000c;backdrop-filter:blur(18px);overflow:hidden}.chat-panel header{height:54px;flex:0 0 54px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #ffffff12}.chat-panel header div{display:flex;flex-direction:column;gap:2px}.chat-panel header b{font-size:13px;color:#f1d36d}.chat-panel header small{font-size:8px;color:#81765d}.chat-panel header button{border:0;background:none;color:#bcae8a;font-size:25px;line-height:1;cursor:pointer}.chat-list{flex:1;min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}.empty-chat{margin:auto;text-align:center;color:#786f5c;font-size:10px;line-height:1.6}.chat-msg{max-width:86%;align-self:flex-start;display:flex;flex-direction:column;gap:3px;padding:8px 10px;border:1px solid #ffffff10;border-radius:13px 13px 13px 4px;background:#15110b}.chat-msg.mine{align-self:flex-end;border-radius:13px 13px 4px 13px;background:#2b210e;border-color:#e0bb5630}.chat-msg b{font-size:8px;color:#d9b957}.chat-msg span{font-size:11px;color:#eee2c3;word-break:break-word}.chat-input{display:flex;gap:7px;padding:9px;border-top:1px solid #ffffff12}.chat-input input{min-width:0;flex:1;border:1px solid #ffffff12;border-radius:12px;background:#120e09;color:#f4e8c8;padding:9px 10px;outline:none;font-size:11px}.chat-input input:focus{border-color:#dcb95366}.chat-input button{border:1px solid #e0bd5848;border-radius:12px;background:#4a360e;color:#f4d66f;font-weight:900;font-size:10px;padding:0 12px}.chat-input button:disabled{opacity:.45}
      @media(max-width:520px){.board-wrap{width:min(96vw,calc(100svh - 26px));height:min(96vw,calc(100svh - 26px))}.board-frame{padding:4px;border-radius:22px}.board-frame>div{border-radius:19px}.tool{width:48px;height:48px;border-radius:15px}.chat-tool{top:8px;right:8px}.mic-tool{top:8px;left:8px}.dice-float{right:6px;bottom:7px;width:62px;height:62px}.turn-pill{max-width:78vw}.chat-panel{top:62px;right:7px;bottom:52px;width:calc(100vw - 14px);border-radius:19px}}
      @media(max-height:620px) and (orientation:landscape){.board-wrap{width:min(70svh,70vw);height:min(70svh,70vw)}.chat-panel{top:42px;bottom:42px;width:min(330px,45vw)}.match-badge{top:5px}.turn-pill{bottom:5px}}
    `}</style>
  </main>;
}
