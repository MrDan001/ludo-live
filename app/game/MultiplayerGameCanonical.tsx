"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  io,
  type Socket,
} from "socket.io-client";

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

import {
  playerColorsForSeats,
} from "../../lib/ludoRules";

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

type TokenMap = Record<
  string,
  Record<string, { position: number }>
>;

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

const COLORS: Color[] = [
  "red",
  "yellow",
  "green",
  "blue",
];

const initialTokens = (): DemoToken[] =>
  COLORS.flatMap((color) =>
    Array.from(
      { length: 4 },
      (_, id) => ({
        color,
        id,
        position: 0,
        state: "yard" as const,
      }),
    ),
  );

const displayTheme = (
  value: string,
): BoardThemeId =>
  value === "midnight-live"
    ? "night"
    : value in BOARD_PALETTES
      ? (value as BoardThemeId)
      : "classic";

const emitAudio = (
  kind: "dice" | "move" | "win",
) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("ludo-audio", {
        detail: kind,
      }),
    );
  }
};

export default function MultiplayerGameCanonical() {
  const [theme, setTheme] =
    useState<BoardThemeId>("classic");

  const [skinId, setSkinId] =
    useState("classic");

  const [socket, setSocket] =
    useState<Socket | null>(null);

  const [me, setMe] =
    useState("");

  const [game, setGame] =
    useState<GameState | null>(null);

  const [tokens, setTokens] =
    useState<DemoToken[]>(initialTokens);

  const [roll, setRoll] =
    useState<Face>(1);

  const [pending, setPending] =
    useState<Face | null>(null);

  const [remoteRolling, setRemoteRolling] =
    useState(false);

  const [animating, setAnimating] =
    useState(false);

  const [revision, setRevision] =
    useState(-1);

  const [notice, setNotice] =
    useState("Connecting…");

  const paramsRef =
    useRef<URLSearchParams | null>(null);

  const winnerSoundRef =
    useRef<string | null>(null);

  const players =
    game?.players || [];

  const myPlayer =
    players.find(
      (p) => p.playerId === me,
    );

  const myColors =
    useMemo<Color[]>(
      () =>
        myPlayer?.colors?.length
          ? myPlayer.colors
          : (playerColorsForSeats(
              players.length === 2 ? 2 : 4,
              myPlayer?.seat ?? 0,
            ) as Color[]),
      [players, myPlayer],
    );

  const currentId =
    game?.currentPlayerId || "";

  const myTurn =
    currentId === me;

  const isTournament =
    typeof window !== "undefined" &&
    new URLSearchParams(
      location.search,
    ).has("tournament");

  const legalTokenKeys =
    useMemo(
      () =>
        pending === null || !myTurn
          ? []
          : tokens
              .filter(
                (t) =>
                  myColors.includes(t.color) &&
                  canMove(
                    tokens,
                    t,
                    pending,
                  ),
              )
              .map(
                (t) =>
                  `${t.color}:${t.id}`,
              ),
      [
        pending,
        myTurn,
        tokens,
        myColors,
      ],
    );

  const applyServerTokens = (
    serverTokens: TokenMap,
  ) => {
    setTokens((prev) =>
      prev.map((t) => {
        const position =
          serverTokens?.[t.color]?.[
            String(t.id)
          ]?.position;

        if (
          typeof position !== "number"
        ) {
          return t;
        }

        return {
          ...t,
          position,
          state:
            position === FINISH_PROGRESS
              ? "finished"
              : position > 51
                ? "home"
                : position === 0
                  ? "yard"
                  : "track",
        };
      }),
    );
  };

  /*
   * Load board customization.
   */
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          "ludo-match-board",
        );

      if (saved) {
        setSkinId(saved);
        setTheme(displayTheme(saved));
      }
    } catch {}

    const load = async () => {
      try {
        const response =
          await fetch(
            "/api/customization",
            {
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        const equipped =
          String(
            data?.equippedBoard || "",
          );

        if (equipped) {
          setSkinId(equipped);
          setTheme(
            displayTheme(equipped),
          );

          try {
            localStorage.setItem(
              "ludo-match-board",
              equipped,
            );
          } catch {}
        }
      } catch {}
    };

    void load();
  }, []);

  /*
   * Socket.IO multiplayer connection.
   *
   * IMPORTANT:
   * Railway is more reliable when the initial
   * Socket.IO handshake uses polling and then
   * upgrades to WebSocket.
   */
  useEffect(() => {
    let alive = true;
    let currentSocket: Socket | null =
      null;

    (async () => {
      let pid = "";
      let profileName = "Player";

      /*
       * Load authenticated player.
       */
      try {
        const response =
          await fetch(
            "/api/auth",
            {
              cache: "no-store",
            },
          );

        const auth =
          await response.json();

        pid = String(
          auth?.user?.id || "",
        );

        profileName = String(
          auth?.user?.username ||
            "Player",
        );
      } catch {
        /*
         * Keep default identity.
         */
      }

      if (!alive) return;

      setMe(pid);

      const params =
        new URLSearchParams(
          location.search,
        );

      paramsRef.current = params;

      const roomCode =
        params.get("room") || "";

      const roomName =
        profileName ||
        params.get("name") ||
        "Player";

      let roomSize =
        Number(
          params.get("size") || 4,
        );

      try {
        const saved =
          JSON.parse(
            localStorage.getItem(
              "ludo-room",
            ) || "null",
          );

        if (!params.get("size")) {
          roomSize =
            Number(
              saved?.players,
            ) === 2
              ? 2
              : 4;
        }
      } catch {}

      /*
       * Create ONE Socket.IO connection.
       *
       * Polling is deliberately first.
       * Socket.IO can then upgrade the same
       * connection to WebSocket when available.
       */
      const s = io(
        location.origin,
        {
          path: "/socket.io/",
          transports: [
            "polling",
            "websocket",
          ],
          upgrade: true,
          rememberUpgrade: false,
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts:
            Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
        },
      );

      currentSocket = s;

      setSocket(s);

      /*
       * Initial connection.
       */
      s.on("connect", () => {
        if (!alive) return;

        setNotice(
          isTournament
            ? "TOURNAMENT MATCH • CONNECTED"
            : "LIVE MATCH • CONNECTED",
        );

        /*
         * Rejoin the room after every
         * successful reconnect.
         */
        if (roomCode && pid) {
          s.emit(
            "join-room",
            {
              roomCode,
              name: roomName,
              roomSize,
              playerId: pid,
              board:
                localStorage.getItem(
                  "ludo-match-board",
                ) || "classic",
              dice: "classic",
            },
          );
        }
      });

      /*
       * Socket.IO connection error.
       *
       * This prevents the UI from silently
       * sitting forever on "Connecting…".
       */
      s.on(
        "connect_error",
        (error) => {
          if (!alive) return;

          console.error(
            "[Ludo Live] Socket.IO connection error:",
            error,
          );

          setNotice(
            "Multiplayer connection failed — retrying…",
          );
        },
      );

      /*
       * Reconnection lifecycle.
       */
      s.io.on(
        "reconnect_attempt",
        () => {
          if (!alive) return;

          setNotice(
            "Reconnecting to live match…",
          );
        },
      );

      s.io.on(
        "reconnect",
        () => {
          if (!alive) return;

          setNotice(
            "LIVE MATCH • RECONNECTED",
          );
        },
      );

      s.io.on(
        "reconnect_error",
        () => {
          if (!alive) return;

          setNotice(
            "Still trying to reconnect…",
          );
        },
      );

      s.io.on(
        "reconnect_failed",
        () => {
          if (!alive) return;

          setNotice(
            "Unable to reconnect to live match.",
          );
        },
      );

      /*
       * Room roster.
       */
      s.on(
        "roster",
        (members: Player[]) => {
          if (!alive) return;

          const host =
            members.find(
              (m) => m.host,
            );

          if (host?.board) {
            const hostSkin =
              String(host.board);

            setSkinId(hostSkin);
            setTheme(
              displayTheme(hostSkin),
            );
          }

          /*
           * Keep player roster visible even
           * before the first game-state packet.
           */
          setGame((previous) => {
            if (!previous) {
              return {
                status: "waiting",
                currentPlayerId: null,
                dice: null,
                pendingMove: null,
                sixStreak: 0,
                players: members,
                tokens: {},
                winnerId: null,
              };
            }

            return {
              ...previous,
              players: members,
            };
          });
        },
      );

      /*
       * Server confirms the match has started.
       */
      s.on(
        "start-game",
        ({
          board,
        }: {
          board?: string;
        }) => {
          if (!alive) return;

          if (board) {
            const hostSkin =
              String(board);

            setSkinId(hostSkin);
            setTheme(
              displayTheme(hostSkin),
            );
          }

          setNotice(
            isTournament
              ? "TOURNAMENT MATCH LIVE"
              : "LIVE MATCH",
          );
        },
      );

      /*
       * Server-side start error.
       */
      s.on(
        "start-error",
        (message: string) => {
          if (!alive) return;

          setNotice(
            message ||
              "Unable to start match.",
          );
        },
      );

      /*
       * Authoritative game state.
       */
      s.on(
        "game-state",
        (next: GameState) => {
          if (!alive) return;

          const r = Number(
            next.stateRevision ?? -1,
          );

          /*
           * Ignore stale states.
           */
          if (
            r >= 0 &&
            r < revision
          ) {
            return;
          }

          if (r >= 0) {
            setRevision(r);
          }

          setGame(next);

          applyServerTokens(
            next.tokens || {},
          );

          setPending(
            next.currentPlayerId === pid
              ? next.pendingMove
              : null,
          );

          if (next.dice) {
            setRoll(next.dice);
          }

          /*
           * Winner audio.
           */
          if (
            next.winnerId &&
            winnerSoundRef.current !==
              next.winnerId
          ) {
            winnerSoundRef.current =
              next.winnerId;

            emitAudio("win");
          }

          /*
           * Match status.
           */
          if (next.winnerId) {
            setNotice(
              next.winnerId === pid
                ? "🏆 YOU WON THE MATCH!"
                : `${
                    next.players.find(
                      (p) =>
                        p.playerId ===
                        next.winnerId,
                    )?.name ||
                    "Player"
                  } won the match.`,
            );
          } else if (
            next.status === "paused"
          ) {
            setNotice(
              "Match paused — waiting for the player to reconnect.",
            );
          } else if (
            next.currentPlayerId === pid
          ) {
            setNotice(
              next.pendingMove
                ? `You rolled ${next.pendingMove}. Pick a token.`
                : "Your turn — roll the dice.",
            );
          } else {
            setNotice(
              `${
                next.players.find(
                  (p) =>
                    p.playerId ===
                    next.currentPlayerId,
                )?.name ||
                "Player"
              }'s turn.`,
            );
          }
        },
      );

      /*
       * Dice event.
       */
      s.on(
        "game-dice",
        ({
          playerId,
          value,
        }: {
          playerId: string;
          value: Face;
          stateRevision?: number;
        }) => {
          if (!alive) return;

          setRoll(value);

          emitAudio("dice");

          if (playerId === pid) {
            setPending(value);

            setNotice(
              `You rolled ${value}. Checking legal moves…`,
            );
          } else {
            setRemoteRolling(true);

            setNotice(
              "Opponent is rolling…",
            );

            window.setTimeout(() => {
              if (alive) {
                setRemoteRolling(false);
              }
            }, 650);
          }
        },
      );

      /*
       * Move event.
       */
      s.on(
        "game-moved",
        () => {
          if (!alive) return;

          emitAudio("move");

          setPending(null);
          setAnimating(true);

          window.setTimeout(() => {
            if (alive) {
              setAnimating(false);
            }
          }, 500);
        },
      );

      /*
       * Disconnect.
       */
      s.on(
        "disconnect",
        (reason) => {
          if (!alive) return;

          console.warn(
            "[Ludo Live] Socket disconnected:",
            reason,
          );

          setNotice(
            "Reconnecting to live match…",
          );
        },
      );
    })();

    /*
     * Cleanup.
     */
    return () => {
      alive = false;

      if (currentSocket) {
        currentSocket.removeAllListeners();
        currentSocket.disconnect();
        currentSocket = null;
      }

      setSocket(null);
    };
  }, [isTournament]);

  /*
   * Automatically skip when there are
   * no legal moves.
   */
  useEffect(() => {
    if (
      !socket ||
      !game ||
      !myTurn ||
      pending === null
    ) {
      return;
    }

    if (
      hasLegalMove(
        tokens,
        myColors,
        pending,
      )
    ) {
      return;
    }

    setPending(null);

    socket.emit(
      "game-move",
      {
        tokenId: "__skip__",
        to: 0,
      },
    );
  }, [
    socket,
    game,
    myTurn,
    pending,
    tokens,
    myColors,
  ]);

  /*
   * Token selection.
   */
  const chooseToken = (
    color: Color,
    id: number,
  ) => {
    if (
      !socket ||
      !game ||
      !myTurn ||
      pending === null ||
      animating
    ) {
      return;
    }

    const token =
      tokens.find(
        (t) =>
          t.color === color &&
          t.id === id,
      );

    if (
      !token ||
      !myColors.includes(color) ||
      !canMove(
        tokens,
        token,
        pending,
      )
    ) {
      return;
    }

    const target =
      nextProgress(
        token.position,
        pending,
      );

    if (target === null) {
      return;
    }

    setPending(null);
    setAnimating(true);

    socket.emit(
      "game-move",
      {
        tokenId: `${color}:${id}`,
        to: target,
      },
    );

    setNotice("Moving…");
  };

  /*
   * Dice roll.
   */
  const handleRoll = () => {
    if (
      !socket ||
      !game ||
      !myTurn ||
      pending !== null ||
      animating ||
      game.status !== "playing"
    ) {
      return;
    }

    socket.emit("game-roll");
  };

  const p =
    BOARD_PALETTES[theme] ||
    BOARD_PALETTES.classic;

  const headerMap:
    Record<
      string,
      [string, string, string]
    > = {
    classic: [
      "👑",
      "TIMELESS CLASSIC",
      "CLASSIC LUDO",
    ],
    love: [
      "💗",
      "HEART COLLECTION",
      "LOVE EDITION",
    ],
    night: [
      "🌃",
      "CITY AFTER DARK",
      "NIGHT CITY",
    ],
    golden: [
      "🏆",
      "ROYAL COLLECTION",
      "GOLDEN ROYAL",
    ],
  };

  const header =
    headerMap[skinId] ||
    headerMap[theme] ||
    headerMap.classic;

  return (
    <AppFrame
      back={
        isTournament
          ? "/tournament"
          : "/lobby"
      }
    >
      <main
        className="mp-canonical"
        style={
          {
            "--accent": p.accent,
            "--bg": p.bg,
          } as React.CSSProperties
        }
      >
        <div className="mp-wrap">
          <header className="mp-head">
            <div className="mp-icon">
              {header[0]}
            </div>

            <div>
              <div className="mp-eyebrow">
                {header[1]}
              </div>

              <h1>
                {header[2]}
              </h1>

              <div className="mp-sub">
                {players.length === 4
                  ? "4-player"
                  : "2-player"}{" "}
                live multiplayer •
                canonical rules
              </div>
            </div>

            <div className="mp-live">
              <span /> LIVE
            </div>
          </header>

          <div className="mp-label">
            <span />{" "}
            {isTournament
              ? "TOURNAMENT MATCH"
              : "LIVE MATCH"}
          </div>

          <section className="mp-board">
            <LudoBoard
              theme={theme}
              demoTokens={tokens}
              onTokenClick={chooseToken}
              legalTokenKeys={
                legalTokenKeys
              }
            />
          </section>

          <section className="mp-controls">
            <div>
              <div className="mp-turn">
                {game?.status ===
                "finished"
                  ? "MATCH FINISHED"
                  : myTurn
                    ? "YOUR TURN"
                    : currentId
                      ? `${
                          players.find(
                            (pl) =>
                              pl.playerId ===
                              currentId,
                          )?.name ||
                
