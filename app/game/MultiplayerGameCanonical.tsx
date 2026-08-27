"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import AppFrame from "../_components/AppFrame";
import LudoBoard, {
  BOARD_PALETTES,
  type BoardThemeId,
  type DemoToken,
} from "../_components/LudoBoardMultiplayer";
import DemoDice from "../_components/DemoDice";
import {
  canMove,
  hasLegalMove,
  nextProgress,
  FINISH_PROGRESS,
  type DiceValue,
} from "../../lib/ludoEngine";
import { playerColorsForSeats } from "../../lib/ludoRules";

type Color = "red" | "yellow" | "green" | "blue";
type Face = DiceValue;

type Player = {
  playerId: string;
  name: string;
  seat: number;
  host?: boolean;
  ready?: boolean;
  connected?: boolean;
  colors?: Color[];
  board?: string;
};

type TokenMap = Record<string, Record<string, { position: number }>>;

type GameState = {
  status: string;
  currentPlayerId: string | null;
  dice: Face | null;
  pendingMove: Face | null;
  sixStreak: number;
  players: Player[];
  tokens: TokenMap;
  winnerId?: string | null;
  stateRevision?: number;
};

const COLORS: Color[] = ["red", "yellow", "green", "blue"];
const FINISH = FINISH_PROGRESS;

const initialTokens = (): DemoToken[] =>
  COLORS.flatMap((color) =>
    Array.from({ length: 4 }, (_, id) => ({
      color,
      id,
      position: 0,
      state: "yard" as const,
    }))
  );

const displayTheme = (value: string): BoardThemeId =>
  value === "midnight-live"
    ? "night"
    : value in BOARD_PALETTES
      ? (value as BoardThemeId)
      : "classic";

const emitAudio = (kind: "dice" | "win") => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ludo-audio", { detail: kind }));
  }
};

function normalizeTokens(serverTokens: TokenMap): DemoToken[] {
  return COLORS.flatMap((color) =>
    Array.from({ length: 4 }, (_, id) => {
      const raw = serverTokens?.[color]?.[String(id)]?.position;
      const position = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
      return {
        color,
        id,
        position,
        state:
          position === 0
            ? ("yard" as const)
            : position === FINISH
              ? ("finished" as const)
              : position > 51
                ? ("home" as const)
                : ("track" as const),
      };
    })
  );
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

  const aliveRef = useRef(true);
  const revisionRef = useRef(-1);
  const diceTimerRef = useRef<number | null>(null);
  const moveTimerRef = useRef<number | null>(null);
  const paramsRef = useRef<URLSearchParams | null>(null);
  const winnerSoundRef = useRef<string | null>(null);

  const players = game?.players ?? [];
  const myPlayer = players.find((player) => player.playerId === me);
  const myColors = useMemo<Color[]>(
    () =>
      myPlayer?.colors?.length
        ? myPlayer.colors
        : (playerColorsForSeats(
            players.length === 2 ? 2 : 4,
            myPlayer?.seat ?? 0
          ) as Color[]),
    [myPlayer, players.length]
  );

  const currentId = game?.currentPlayerId ?? "";
  const myTurn = currentId === me;

  const isTournament =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("tournament");

  const legalTokenKeys = useMemo(() => {
    if (pending === null || !myTurn) return [];
    return tokens
      .filter(
        (token) =>
          myColors.includes(token.color) && canMove(tokens, token, pending)
      )
      .map((token) => `${token.color}:${token.id}`);
  }, [pending, myTurn, tokens, myColors]);

  const applyServerState = useCallback((next: GameState) => {
    const nextRevision = Number(next.stateRevision ?? -1);
    if (
      nextRevision >= 0 &&
      revisionRef.current >= 0 &&
      nextRevision < revisionRef.current
    ) {
      return false;
    }

    if (nextRevision >= 0) {
      revisionRef.current = nextRevision;
      setRevision(nextRevision);
    }

    setGame(next);
    setTokens(normalizeTokens(next.tokens ?? {}));
    return true;
  }, []);

  useEffect(() => {
    aliveRef.current = true;

    try {
      const saved = localStorage.getItem("ludo-match-board");
      if (saved) {
        setSkinId(saved);
        setTheme(displayTheme(saved));
      }
    } catch {
      // localStorage is optional.
    }

    const loadCustomization = async () => {
      try {
        const response = await fetch("/api/customization", {
          cache: "no-store",
        });
        const data = await response.json();
        const equipped = String(data?.equippedBoard || "");
        if (!equipped || !aliveRef.current) return;
        setSkinId(equipped);
        setTheme(displayTheme(equipped));
        try {
          localStorage.setItem("ludo-match-board", equipped);
        } catch {
          // Ignore storage failures.
        }
      } catch {
        // Keep the default board.
      }
    };

    void loadCustomization();

    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      let playerId = "";
      let profileName = "Player";

      try {
        const response = await fetch("/api/auth", { cache: "no-store" });
        const data = await response.json();
        playerId = String(data?.user?.id || "");
        profileName = String(data?.user?.username || "Player");
      } catch {
        // The server will reject a room join without a valid player id.
      }

      if (!mounted || !playerId) return;

      setMe(playerId);

      const params = new URLSearchParams(window.location.search);
      paramsRef.current = params;
      const roomCode = params.get("room") || "";
      const roomName = profileName || params.get("name") || "Player";

      let roomSize = Number(params.get("size") || 4);
      try {
        const savedRoom = JSON.parse(
          localStorage.getItem("ludo-room") || "null"
        );
        if (!params.get("size")) {
          roomSize = Number(savedRoom?.players) === 2 ? 2 : 4;
        }
      } catch {
        // Keep URL/default size.
      }

      const nextSocket = io(window.location.origin, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 250,
      });

      setSocket(nextSocket);

      const clearDiceTimer = () => {
        if (diceTimerRef.current !== null) {
          window.clearTimeout(diceTimerRef.current);
          diceTimerRef.current = null;
        }
      };

      const clearMoveTimer = () => {
        if (moveTimerRef.current !== null) {
          window.clearTimeout(moveTimerRef.current);
          moveTimerRef.current = null;
        }
      };

      nextSocket.on("connect", () => {
        if (!mounted) return;
        setNotice(
          isTournament
            ? "TOURNAMENT MATCH • CONNECTED"
            : "LIVE MATCH • CONNECTED"
        );

        if (roomCode) {
          let board = "classic";
          try {
            board = localStorage.getItem("ludo-match-board") || "classic";
          } catch {
            // Keep classic.
          }
          nextSocket.emit("join-room", {
            roomCode,
            name: roomName,
            roomSize,
            playerId,
            board,
            dice: "classic",
          });
        }
      });

      nextSocket.on("roster", (members: Player[]) => {
        const host = members.find((member) => member.host);
        if (!host?.board || !mounted) return;
        const hostSkin = String(host.board);
        setSkinId(hostSkin);
        setTheme(displayTheme(hostSkin));
      });

      nextSocket.on("start-game", ({ board }: { board?: string }) => {
        if (!mounted) return;
        if (board) {
          const hostSkin = String(board);
          setSkinId(hostSkin);
          setTheme(displayTheme(hostSkin));
        }
        setNotice(
          isTournament ? "TOURNAMENT MATCH LIVE" : "LIVE MATCH"
        );
      });

      nextSocket.on("start-error", (message: string) => {
        if (mounted) setNotice(message);
      });

      nextSocket.on("game-dice", (event: {
        playerId: string;
        value: Face;
        stateRevision?: number;
      }) => {
        if (!mounted) return;

        const eventRevision = Number(event.stateRevision ?? -1);
        if (
          eventRevision >= 0 &&
          revisionRef.current >= 0 &&
          eventRevision < revisionRef.current
        ) {
          return;
        }

        if (eventRevision >= 0) {
          revisionRef.current = eventRevision;
          setRevision(eventRevision);
        }

        setRoll(event.value);
        setRemoteRolling(true);
        emitAudio("dice");
        setNotice(
          event.playerId === playerId
            ? `You rolled ${event.value}. Checking legal moves…`
            : "Opponent is rolling…"
        );

        clearDiceTimer();
        diceTimerRef.current = window.setTimeout(() => {
          if (mounted) setRemoteRolling(false);
          diceTimerRef.current = null;
        }, 900);
      });

      nextSocket.on("game-state", (next: GameState) => {
        if (!mounted) return;
        const accepted = applyServerState(next);
        if (!accepted) return;

        if (next.dice !== null) setRoll(next.dice);
        setPending(
          next.currentPlayerId === playerId ? next.pendingMove : null
        );

        if (
          next.winnerId &&
          winnerSoundRef.current !== next.winnerId
        ) {
          winnerSoundRef.current = next.winnerId;
          emitAudio("win");
        }

        if (next.winnerId) {
          const winnerName =
            next.players.find(
              (player) => player.playerId === next.winnerId
            )?.name || "Player";
          setNotice(
            next.winnerId === playerId
              ? "🏆 YOU WON THE MATCH!"
              : `${winnerName} won the match.`
          );
        } else if (next.status === "paused") {
          setNotice("Match paused — waiting for the player to reconnect.");
        } else if (next.currentPlayerId === playerId) {
          setNotice(
            next.pendingMove !== null
              ? `You rolled ${next.pendingMove}. Pick a token.`
              : "Your turn — roll the dice."
          );
        } else {
          const currentName =
            next.players.find(
              (player) => player.playerId === next.currentPlayerId
            )?.name || "Player";
          setNotice(`${currentName}'s turn.`);
        }
      });

      nextSocket.on("game-moved", () => {
        if (!mounted) return;
        setAnimating(true);
        clearMoveTimer();
        moveTimerRef.current = window.setTimeout(() => {
          if (mounted) setAnimating(false);
          moveTimerRef.current = null;
        }, 650);
      });

      nextSocket.on("disconnect", () => {
        if (mounted) setNotice("Reconnecting…");
      });

      return () => {
        clearDiceTimer();
        clearMoveTimer();
        nextSocket.disconnect();
      };
    };

    void connect();

    return () => {
      mounted = false;
    };
  }, [applyServerState, isTournament]);

  useEffect(() => {
    if (!socket || !game || !myTurn || pending === null) return;
    if (hasLegalMove(tokens, myColors, pending)) return;

    setPending(null);
    socket.emit("game-move", { tokenId: "__skip__", to: 0 });
  }, [socket, game, myTurn, pending, tokens, myColors]);

  const chooseToken = useCallback(
    (color: Color, id: number) => {
      if (
        !socket ||
        !game ||
        !myTurn ||
        pending === null ||
        animating
      ) {
        return;
      }

      const token = tokens.find(
        (candidate) => candidate.color === color && candidate.id === id
      );
      if (
        !token ||
        !myColors.includes(color) ||
        !canMove(tokens, token, pending)
      ) {
        return;
      }

      const target = nextProgress(token.position, pending);
      if (target === null) return;

      setPending(null);
      setAnimating(true);
      socket.emit("game-move", {
        tokenId: `${color}:${id}`,
        to: target,
      });
      setNotice("Moving…");
    },
    [socket, game, myTurn, pending, animating, tokens, myColors]
  );

  const handleRoll = useCallback(() => {
    if (
      !socket ||
      !game ||
      !myTurn ||
      pending !== null ||
      animating ||
      remoteRolling ||
      game.status !== "playing"
    ) {
      return;
    }

    // Do not animate or choose a value locally. The server owns the roll.
    socket.emit("game-roll");
  }, [socket, game, myTurn, pending, animating, remoteRolling]);

  const palette = BOARD_PALETTES[theme] || BOARD_PALETTES.classic;
  const headerMap: Record<string, [string, string, string]> = {
    classic: ["👑", "TIMELESS CLASSIC", "CLASSIC LUDO"],
    love: ["💗", "HEART COLLECTION", "LOVE EDITION"],
    night: ["🌃", "CITY AFTER DARK", "NIGHT CITY"],
    golden: ["🏆", "ROYAL COLLECTION", "GOLDEN ROYAL"],
  };
  const header =
    headerMap[skinId] || headerMap[theme] || headerMap.classic;

  return (
    <AppFrame back="/home">
      <main
        className="mp-canonical"
        style={
          {
            "--accent": palette.accent,
            "--bg": palette.bg,
          } as React.CSSProperties
        }
      >
        <div className="mp-wrap">
          <header className="mp-head">
            <div className="mp-icon">{header[0]}</div>
            <div>
              <div className="mp-eyebrow">{header[1]}</div>
              <h1>{header[2]}</h1>
              <div className="mp-sub">
                {players.length === 4 ? "4-player" : "2-player"} live
                multiplayer • server authoritative
              </div>
            </div>
            <div className="mp-live">
              <span /> LIVE
            </div>
          </header>

          <div className="mp-label">
            <span /> {isTournament ? "TOURNAMENT MATCH" : "LIVE MATCH"}
          </div>

          <section className="mp-board">
            <LudoBoard
              theme={theme}
              demoTokens={tokens}
              onTokenClick={chooseToken}
              legalTokenKeys={legalTokenKeys}
              animateUpdates
              finishSound
            />
          </section>

          <section className="mp-controls">
            <div>
              <div className="mp-turn">
                {game?.status === "finished"
                  ? "MATCH FINISHED"
                  : myTurn
                    ? "YOUR TURN"
                    : currentId
                      ? `${players.find((player) => player.playerId === currentId)?.name || "PLAYER"} TURN`
                      : "MATCH"}
              </div>
              <b>
                {game?.winnerId === me
                  ? "🏆 MATCH WON"
                  : pending !== null
                    ? "Pick a token"
                    : "Roll the dice"}
              </b>
              <p>{notice}</p>
            </div>

            <DemoDice
              value={roll}
              onRoll={handleRoll}
              disabled={
                !myTurn ||
                pending !== null ||
                animating ||
                remoteRolling ||
                !game ||
                game.status !== "playing"
              }
              botRolling={remoteRolling}
            />
          </section>
        </div>
      </main>

      <style jsx global>{`
        .mp-canonical{width:100%;height:100dvh;min-height:100dvh;background:var(--bg);color:#fff;overflow:hidden;overscroll-behavior:none}
        .mp-wrap{width:100%;max-width:720px;height:100dvh;margin:0 auto;padding:8px 12px;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:6px;overflow:hidden}
        .mp-head{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:20px;background:color-mix(in srgb,var(--bg) 75%,white 25%);border:1px solid color-mix(in srgb,var(--accent) 65%,white 35%);box-shadow:0 12px 30px rgba(0,0,0,.22);min-height:70px}
        .mp-icon{font-size:30px}.mp-eyebrow{font-size:8px;letter-spacing:1.7px;font-weight:900;opacity:.75}.mp-head h1{margin:2px 0;font-size:20px}.mp-sub{font-size:10px;opacity:.7}.mp-live{margin-left:auto;white-space:nowrap;font-weight:900;font-size:11px}.mp-live span,.mp-label span{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent);margin-right:6px;box-shadow:0 0 10px var(--accent)}
        .mp-label{padding:5px 0;font-size:10px;letter-spacing:2.5px;font-weight:900}.mp-board{width:100%;min-height:0;display:grid;place-items:center;padding:4px;border-radius:22px;background:linear-gradient(145deg,color-mix(in srgb,var(--bg) 78%,white 22%),color-mix(in srgb,var(--bg) 94%,black 6%));box-shadow:0 16px 38px rgba(0,0,0,.28);overflow:hidden}.mp-board>section,.mp-board>div{width:min(100%,calc(100dvh - 220px));max-width:100%;aspect-ratio:1/1;max-height:100%;overflow:hidden}
        .mp-controls{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;border-radius:18px;border:1px solid color-mix(in srgb,var(--accent) 75%,white 25%);background:color-mix(in srgb,var(--bg) 82%,white 18%);box-shadow:0 12px 30px rgba(0,0,0,.2);min-height:68px}.mp-turn{font-size:9px;letter-spacing:1.5px;font-weight:900;opacity:.72}.mp-controls b{display:block;margin-top:4px;font-size:16px}.mp-controls p{margin:3px 0 0;font-size:11px;opacity:.82;max-width:220px}
        @media(max-height:650px){.mp-head{min-height:58px;padding:7px 10px}.mp-icon{font-size:24px}.mp-head h1{font-size:17px}.mp-sub{font-size:9px}.mp-label{padding:2px 0}.mp-controls{min-height:58px;padding:7px 10px}.mp-controls b{font-size:14px}.mp-controls p{font-size:10px}.mp-board>section,.mp-board>div{width:min(100%,calc(100dvh - 175px))}}
        @media(max-width:420px){.mp-wrap{padding:6px 8px}.mp-live{display:none}.mp-head{min-height:62px}.mp-board>section,.mp-board>div{width:min(100%,calc(100dvh - 205px))}}
      `}</style>
    </AppFrame>
  );
}
