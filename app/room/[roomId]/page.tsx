"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMultiplayerGame } from "@/lib/hooks/useMultiplayerGame";
import type { PlayerColor } from "@/lib/engine/gameState";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRoomChat } from "@/lib/hooks/useRoomChat";
import { getSocket } from "@/lib/socket/client";
import Board from "@/components/board/Board";
import Dice from "@/components/board/Dice";
import DiceOverlay from "@/components/board/DiceOverlay";
import PlayerBadge from "@/components/layout/PlayerBadge";
import VoiceControls from "@/components/layout/VoiceControls";
import ChatPanel from "@/components/layout/ChatPanel";
import VoiceChatPanel from "@/components/layout/VoiceChatPanel";
import RoomLobby from "@/components/layout/RoomLobby";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { room, yourColor, connect, joinRoom, roll, selectMove, rollSeq, lastRoll, finishMoveAnimation } =
    useMultiplayerGame();
  const { gems, name, avatarUrl, dbUserId, checkSession } = useAuth();
  const { connect: connectChat, unreadCount, markRead } = useRoomChat();

  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Which die value the player picked to play this turn, when there were
  // two distinct usable values to choose between. Reset the instant a new
  // roll happens (see rollSeq) so it never carries over into the next turn.
  const [manualDieChoice, setManualDieChoice] = useState<number | null>(null);

  useEffect(() => {
    setManualDieChoice(null);
  }, [rollSeq]);

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
      joinRoom(roomId, name || "Player", dbUserId, avatarUrl ?? undefined);
    }
  }, [room, dbUserId, roomId, name, avatarUrl, joinRoom]);

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

  // d1 and d2 are never summed for movement - the player picks one value
  // to play. If both dice offer a real (different) choice, wait for a tap;
  // if only one value has any valid moves (or it's doubles), resolve it
  // automatically since there's nothing to actually choose between.
  const distinctDieValues = Array.from(new Set(room.pendingMoves.map((m) => m.dieValue)));
  const needsDieChoice = isYourTurn && distinctDieValues.length > 1;
  const activeDieValue = distinctDieValues.length <= 1 ? distinctDieValues[0] ?? null : manualDieChoice;

  const selectableTokenIds = new Set(
    isYourTurn && activeDieValue !== null
      ? room.pendingMoves.filter((m) => m.dieValue === activeDieValue).map((m) => m.tokenId)
      : []
  );
  // Map top (RED, GREEN) and bottom (BLUE, YELLOW) players. In 2-player
  // team mode there's no RoomPlayer whose primary color is literally
  // Yellow/Blue - that human's primary is Red/Green and Yellow/Blue is
  // their teammateColor, so those badges fall back to matching on that.
  const redPlayer = room.players.find((p) => p.color === "RED");
  const greenPlayer = room.players.find((p) => p.color === "GREEN");
  const bluePlayer = room.players.find((p) => p.color === "BLUE" || p.teammateColor === "BLUE");
  const yellowPlayer = room.players.find((p) => p.color === "YELLOW" || p.teammateColor === "YELLOW");

  // In team mode, a whole team's badges highlight together on their turn
  // slot (currentTurnColor is only ever Red or Green there) - outside
  // team mode this is just a literal color match, same as always.
  const isColorCurrentTurn = (color: PlayerColor) =>
    gameState.teamMode
      ? (color === "RED" || color === "YELLOW" ? "RED" : "GREEN") === gameState.currentTurnColor
      : gameState.currentTurnColor === color;

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden touch-none select-none bg-[#1D110C] flex flex-col items-center justify-between p-2 font-sans">
      {/* Top Header */}
      <div className="w-full max-w-[min(94vw,440px)] flex items-center justify-between px-1 pt-1 shrink-0">
        <button className="text-amber-200 text-xl p-1">☰</button>

        <div className="flex items-center gap-1.5 bg-[#3B2319] border border-amber-900/60 px-3 py-1 rounded-full shadow-inner">
          <span className="text-blue-400 text-xs">💎</span>
          <span className="text-amber-100 text-xs font-bold">{gems ?? 0}</span>
          <button className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold leading-none ml-0.5">
            +
          </button>
        </div>
      </div>

      {gameState.winner && (
        <div className="text-amber-400 font-bold text-sm shrink-0 my-0.5 animate-bounce">
          🏆 {gameState.winner} wins!
        </div>
      )}

      {/* Main Board Unit with Striped Wood Plank Gradient */}
      <div 
        className="w-full max-w-[min(94vw,440px)] border-[6px] border-[#2C1810] shadow-[0_10px_25px_rgba(0,0,0,0.7)] rounded-3xl p-2.5 flex flex-col items-center shrink my-auto relative"
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
        {/* Top Player Badges */}
        <div className="w-full flex items-center justify-between px-1 mb-2 shrink-0">
          <PlayerBadge
            name={redPlayer?.name ?? ""}
            color="RED"
            isCurrentTurn={isColorCurrentTurn("RED")}
            connected={redPlayer?.connected ?? false}
            avatarUrl={redPlayer?.avatarUrl}
            empty={!redPlayer}
          />
          <PlayerBadge
            name={greenPlayer?.name ?? ""}
            color="GREEN"
            isCurrentTurn={isColorCurrentTurn("GREEN")}
            connected={greenPlayer?.connected ?? false}
            avatarUrl={greenPlayer?.avatarUrl}
            empty={!greenPlayer}
          />
        </div>

        {/* Playable Ludo Board Grid */}
        <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-[#2C1810] shrink shadow-2xl">
          <Board
            players={gameState.players}
            selectableTokenIds={selectableTokenIds}
            onTokenClick={(tokenId) => {
              const move = room.pendingMoves.find(
                (m) => m.tokenId === tokenId && m.dieValue === activeDieValue
              );
              if (move) selectMove(room.id, tokenId, move.toPosition);
            }}
            onMoveAnimationComplete={finishMoveAnimation}
          />
          <DiceOverlay
            rollSeq={rollSeq}
            d1={lastRoll?.d1 ?? null}
            d2={lastRoll?.d2 ?? null}
          />
        </div>

        {/* Bottom Player Badges */}
        <div className="w-full flex items-center justify-between px-1 mt-2 shrink-0">
          <PlayerBadge
            name={bluePlayer?.name ?? ""}
            color="BLUE"
            isCurrentTurn={isColorCurrentTurn("BLUE")}
            connected={bluePlayer?.connected ?? false}
            avatarUrl={bluePlayer?.avatarUrl}
            empty={!bluePlayer}
          />
          <PlayerBadge
            name={yellowPlayer?.name ?? ""}
            color="YELLOW"
            isCurrentTurn={isColorCurrentTurn("YELLOW")}
            connected={yellowPlayer?.connected ?? false}
            avatarUrl={yellowPlayer?.avatarUrl}
            empty={!yellowPlayer}
          />
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-[min(94vw,440px)] px-1 pb-1 flex items-center justify-between shrink-0">
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

        {/* Dice Holder */}
        <div className="bg-[#3B2319] border border-amber-900/80 p-1.5 rounded-xl shadow-xl flex items-center justify-center">
          <Dice
            onRoll={() => roll(room.id)}
            canRoll={isYourTurn && !room.pendingRoll && !gameState.winner && !lastRoll}
            active={!!lastRoll}
            rollSeq={rollSeq}
            d1={lastRoll?.d1 ?? null}
            d2={lastRoll?.d2 ?? null}
            needsChoice={needsDieChoice}
            chosenValue={activeDieValue}
            onChooseValue={setManualDieChoice}
            hasValidMoves={room.pendingMoves.length > 0}
          />
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