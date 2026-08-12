"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import type { PlayerColor } from "@/lib/engine/gameState";
import type { MoveSource } from "@/lib/engine/moves";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRoomChat } from "@/lib/hooks/useRoomChat";
import { getSocket } from "@/lib/socket/client";
import Board from "@/components/board/Board";
import Dice from "@/components/board/Dice";
import DiceOverlay from "@/components/board/DiceOverlay";
import ScoreBar from "@/components/board/ScoreBar";
import TurnBanner from "@/components/board/TurnBanner";
import CaptureToast from "@/components/board/CaptureToast";
import FitSquare from "@/components/board/FitSquare";
import VoiceControls from "@/components/layout/VoiceControls";
import ChatPanel from "@/components/layout/ChatPanel";
import VoiceChatPanel from "@/components/layout/VoiceChatPanel";
import RoomLobby from "@/components/layout/RoomLobby";
import TournamentWaitingRoom from "@/components/layout/TournamentWaitingRoom";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  // Tournament match rooms always use the deterministic `t_<tournamentId>`
  // id (see server/rooms.ts createOrJoinTournamentRoom) - recognizing that
  // shape here is enough to route this join through the tournament path
  // instead of the plain create-a-room-and-invite-friends path.
  const tournamentId = roomId?.startsWith("t_") ? roomId.slice(2) : null;
  const {
    room,
    yourColor,
    connect,
    joinRoom,
    joinTournamentMatch,
    roll,
    selectMove,
    rollSeq,
    lastRoll,
    finishMoveAnimation,
  } = useMultiplayerGame();
  const { gems, name, avatarUrl, dbUserId, checkSession } = useAuth();
  const { connect: connectChat, unreadCount, markRead } = useRoomChat();

  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Which of the three tabs (Blue/d1, Red/sum, Green/d2) the player tapped
  // to play this turn, when more than one had a legal move. Reset the
  // instant a new roll happens (see rollSeq) so it never carries over into
  // the next turn.
  const [manualSource, setManualSource] = useState<MoveSource | null>(null);
  const [captureText, setCaptureText] = useState<string | null>(null);
  // Render-time reset instead of an effect that calls setState the moment
  // rollSeq changes - see the same pattern in DiceOverlay.tsx.
  const [seenRollSeq, setSeenRollSeq] = useState(rollSeq);
  if (rollSeq !== seenRollSeq) {
    setSeenRollSeq(rollSeq);
    setManualSource(null);
  }

  useEffect(() => {
    checkSession();
    connect();
  }, [checkSession, connect]);

  // If we land directly on this URL with no room state in memory yet - a
  // page refresh, or opening the link fresh after a disconnect - rejoin
  // using our real user ID. The server matches us back to our existing
  // seat/color instead of treating us as a brand new player.
  useEffect(() => {
    if (!room && dbUserId && roomId) {
      if (tournamentId) {
        joinTournamentMatch(tournamentId, name || "Player", dbUserId, avatarUrl ?? undefined);
      } else {
        joinRoom(roomId, name || "Player", dbUserId, avatarUrl ?? undefined);
      }
    }
  }, [room, dbUserId, roomId, tournamentId, name, avatarUrl, joinRoom, joinTournamentMatch]);

  // Seed room chat history once we're in a room. ChatPanel/VoiceChatPanel
  // are pure overlays from here on - opening or closing them never touches
  // this connection, the game socket, or the voice socket.
  useEffect(() => {
    if (room?.id) connectChat(room.id, room.messages);
  }, [room?.id, connectChat]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  if (!room) {
    return (
      <div className="h-[100dvh] w-screen overflow-hidden bg-[#1D110C] p-8 text-amber-100 flex items-center justify-center select-none font-sans">
        Joining room {roomId}...
      </div>
    );
  }

  if (!room.started) {
    // Tournament match rooms get a minimal waiting screen instead of the
    // full lobby - there's no bet/mode to configure and no one to invite,
    // so none of RoomLobby's controls apply.
    if (room.tournamentId) {
      return <TournamentWaitingRoom />;
    }

    return (
      <>
        <RoomLobby
          onOpenChat={() => {
            setChatOpen(true);
            markRead();
          }}
          onOpenVoice={() => setVoiceOpen(true)}
          chatUnreadCount={unreadCount}
        />
        <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} currentSocketId={getSocket().id ?? null} />
        <VoiceChatPanel
          isOpen={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          players={room.players}
          currentSocketId={getSocket().id ?? null}
        />
      </>
    );
  }

  const gameState = room.gameState!;
  const currentSocketId = getSocket().id ?? null;
  const me = room.players.find((p) => p.socketId === currentSocketId);
  // In 2-player team mode you also control your teammateColor (Yellow if
  // your primary is Red, Blue if Green) - so either match counts as your
  // turn, not just an exact primary-color match against yourColor.
  const isYourTurn =
    !!me && (gameState.currentTurnColor === me.color || gameState.currentTurnColor === me.teammateColor);

  // Three tabs per roll - Blue (d1), Red (d1+d2 combined), Green (d2).
  // Each is only enabled if at least one token has a legal move under it.
  // If exactly one tab is enabled there's nothing to genuinely choose
  // between, so it's picked automatically instead of making the player
  // tap a tab with no real alternative.
  const sourceEnabled: Record<MoveSource, boolean> = {
    d1: room.pendingMoves.some((m) => m.source === "d1"),
    d2: room.pendingMoves.some((m) => m.source === "d2"),
    sum: room.pendingMoves.some((m) => m.source === "sum"),
  };
  const enabledSources = (Object.keys(sourceEnabled) as MoveSource[]).filter((s) => sourceEnabled[s]);
  const activeSource = enabledSources.length <= 1 ? enabledSources[0] ?? null : manualSource;

  const selectableTokenIds = new Set(
    isYourTurn && activeSource !== null
      ? room.pendingMoves.filter((m) => m.source === activeSource).map((m) => m.tokenId)
      : []
  );
  // In team mode, a whole team's badges highlight together on their turn
  // slot (currentTurnColor is only ever Red or Green there) - outside
  // team mode this is just a literal color match, same as always.
  const isColorCurrentTurn = (color: PlayerColor) =>
    gameState.teamMode
      ? (color === "RED" || color === "YELLOW" ? "RED" : "GREEN") === gameState.currentTurnColor
      : gameState.currentTurnColor === color;

  // "Me" for whichever color(s) the local player controls (both colors
  // in team mode), everyone else's real room name otherwise.
  const playerNames: Partial<Record<PlayerColor, string>> = {};
  room.players.forEach((p) => {
    const isMe = p.socketId === currentSocketId;
    playerNames[p.color] = isMe ? "Me" : p.name;
    if (p.teammateColor) playerNames[p.teammateColor] = isMe ? "Me" : p.name;
  });

  // Identity now renders directly inside each color's yard on the board
  // itself (big photo badge) instead of a separate row of badges above
  // and below - these feed that in-board badge per color.
  const playerAvatars: Partial<Record<PlayerColor, string | undefined>> = {};
  const emptyColors = new Set<PlayerColor>(["RED", "GREEN", "BLUE", "YELLOW"]);
  const disconnectedColors = new Set<PlayerColor>();
  room.players.forEach((p) => {
    playerAvatars[p.color] = p.avatarUrl;
    emptyColors.delete(p.color);
    if (p.teammateColor) {
      playerAvatars[p.teammateColor] = p.avatarUrl;
      emptyColors.delete(p.teammateColor);
    }
    if (!p.connected) {
      disconnectedColors.add(p.color);
      if (p.teammateColor) disconnectedColors.add(p.teammateColor);
    }
  });
  const currentTurnColors = new Set<PlayerColor>(
    (["RED", "GREEN", "BLUE", "YELLOW"] as PlayerColor[]).filter((c) => isColorCurrentTurn(c))
  );

  // Score = tokens that have reached home. Grouped onto one row per human
  // seat (team mode combines a team's two colors into their single row).
  const scoreEntries = room.players.map((p) => {
    const colors = p.teammateColor ? [p.color, p.teammateColor] : [p.color];
    const value = gameState.players
      .filter((gp) => colors.includes(gp.color))
      .reduce((sum, gp) => sum + gp.tokens.filter((t) => t.position === 57).length, 0);
    return {
      label: p.socketId === currentSocketId ? "Me" : p.name,
      value,
      active: colors.includes(gameState.currentTurnColor),
    };
  });

  const turnText = gameState.winner
    ? `${playerNames[gameState.winner] ?? gameState.winner} wins!`
    : isYourTurn
    ? "Your Turn"
    : `${playerNames[gameState.currentTurnColor] ?? gameState.currentTurnColor}'s Turn`;

  const handleCapture = (info: { tokenId: string; color: PlayerColor }) => {
    const name = playerNames[info.color] ?? info.color;
    setCaptureText(`${name}'s token was sent home!`);
    setTimeout(() => setCaptureText(null), 1800);
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-y-auto overflow-x-hidden touch-pan-y select-none bg-[#1D110C] flex flex-col items-center p-2 font-sans">
      {/* Top Header */}
      <div className="w-full max-w-[min(98vw,640px)] flex items-center justify-between px-1 pt-1 shrink-0">
        <button className="text-amber-200 text-xl p-1">☰</button>

        {room.tournamentId && (
          <div className="flex items-center gap-1 bg-[#3B2319] border border-amber-900/60 px-2 py-1 rounded-full shadow-inner text-amber-300 text-xs font-bold">
            🏆 Tournament
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-[#3B2319] border border-amber-900/60 px-3 py-1 rounded-full shadow-inner">
          <span className="text-blue-400 text-xs">💎</span>
          <span className="text-amber-100 text-xs font-bold">{gems ?? 0}</span>
          <button className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold leading-none ml-0.5">
            +
          </button>
        </div>
      </div>

      {/* Score readout - one pill per human seat, tokens-home count */}
      <ScoreBar entries={scoreEntries} />

      {/* Main Board Unit with Striped Wood Plank Gradient.
          flex-1 + min-h-0 here (instead of a guessed pixel budget) is what
          actually makes this fill the real leftover vertical space after
          the header/score/bottom rows above and below take theirs - the
          browser computes that, so it can't be "too small" the way a
          hardcoded calc(100dvh - Npx) reservation was. */}
      <div 
        className="w-full max-w-[min(98vw,640px)] flex-1 min-h-0 border-[6px] border-[#2C1810] shadow-[0_10px_25px_rgba(0,0,0,0.7)] rounded-3xl p-2.5 flex flex-col items-center relative"
        style={{
          backgroundColor: "#4E2E1E",
          backgroundImage: `
            linear-gradient(90deg, 
              rgba(0, 0, 0, 0.15) 0%, 
              transparent 2%, 
              transparent 48%, 
              rgba(0, 0, 0, 0.15) 50%, 
              transparent 52%, 
              transparent 98%, 
              rgba(0, 0, 0, 0.15) 100%
            ),
            repeating-linear-gradient(
              0deg,
              #4E2E1E,
              #4E2E1E 24px,
              #3D2316 24px,
              #3D2316 26px,
              #5C3724 26px,
              #5C3724 50px,
              #3D2316 50px,
              #3D2316 52px
            )
          `
        }}
      >
        {/* Playable Ludo Board Grid - FitSquare measures the real
            leftover space in this frame (after the badge/dice/turn rows
            around it) and renders the board at exactly that size, in
            actual pixels - see FitSquare.tsx for why this replaced a
            CSS-only aspect-ratio approach. */}
        <FitSquare className="relative rounded-xl overflow-hidden border-2 border-[#2C1810] shadow-2xl">
          <Board
            players={gameState.players}
            selectableTokenIds={selectableTokenIds}
            playerNames={playerNames}
            playerAvatars={playerAvatars}
            emptyColors={emptyColors}
            disconnectedColors={disconnectedColors}
            currentTurnColors={currentTurnColors}
            onTokenClick={(tokenId) => {
              const move = room.pendingMoves.find(
                (m) => m.tokenId === tokenId && m.source === activeSource
              );
              if (move) selectMove(room.id, tokenId, move.toPosition);
            }}
            onMoveAnimationComplete={finishMoveAnimation}
            onCapture={handleCapture}
          />
          <DiceOverlay
            onRoll={() => roll(room.id)}
            canRoll={isYourTurn && !room.pendingRoll && !gameState.winner && !lastRoll}
            rollSeq={rollSeq}
            d1={lastRoll?.d1 ?? null}
            d2={lastRoll?.d2 ?? null}
          />
          <CaptureToast text={captureText} />
        </FitSquare>

        {/* Three move tabs - Blue plays d1, Red plays d1+d2 combined,
            Green plays d2. Tap one to choose which move set is active. */}
        <div className="w-full flex justify-center mt-3 shrink-0">
          <Dice
            roll={lastRoll ? { d1: lastRoll.d1, d2: lastRoll.d2, sum: lastRoll.d1 + lastRoll.d2 } : null}
            activeSource={isYourTurn ? activeSource : null}
            sourceEnabled={sourceEnabled}
            onSelect={setManualSource}
            disabled={!isYourTurn || !lastRoll}
          />
        </div>

        {/* Big turn banner */}
        <div className="w-full flex justify-center mt-3 shrink-0">
          <TurnBanner text={turnText} isYou={isYourTurn && !gameState.winner} />
        </div>

      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-[min(98vw,640px)] px-1 pb-1 flex items-center justify-between shrink-0">
        {/* Left Voice & Chat Controls */}
        <div className="flex items-center gap-2">
          <VoiceControls roomId={room.id} enabled={room.started} />
          <button
            onClick={() => setVoiceOpen(true)}
            aria-label="Voice chat participants"
            className="w-9 h-9 rounded-full bg-[#3B2319] border border-amber-900/80 text-amber-200 flex items-center justify-center text-sm shadow-md active:scale-95 transition-transform"
          >
            👥
          </button>
          <button
            onClick={() => {
              setChatOpen(true);
              markRead();
            }}
            aria-label="Chat"
            className="relative w-9 h-9 rounded-full bg-[#3B2319] border border-amber-900/80 text-amber-200 flex items-center justify-center text-sm shadow-md active:scale-95 transition-transform"
          >
            💬
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Overlays - render on top of the board without unmounting it or
          touching the game/voice sockets */}
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} currentSocketId={currentSocketId} />
      <VoiceChatPanel
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        players={room.players}
        currentSocketId={currentSocketId}
      />
    </div>
  );
}
