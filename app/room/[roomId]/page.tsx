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
import DiceOverlay from "@/components/board/DiceOverlay";
import CaptureToast from "@/components/board/CaptureToast";
import FitSquare from "@/components/board/FitSquare";
import ChatPanel from "@/components/layout/ChatPanel";
import VoiceChatPanel from "@/components/layout/VoiceChatPanel";
import RoomLobby from "@/components/layout/RoomLobby";
import TournamentWaitingRoom from "@/components/layout/TournamentWaitingRoom";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const tournamentId = roomId?.startsWith("t_") ? roomId.slice(2) : null;
  const { room, connect, joinRoom, joinTournamentMatch, roll, selectMove, rollSeq, lastRoll, finishMoveAnimation } = useMultiplayerGame();
  const { name, avatarUrl, dbUserId, checkSession } = useAuth();
  const { connect: connectChat, unreadCount, markRead } = useRoomChat();
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [captureText, setCaptureText] = useState<string | null>(null);
  const [manualSource, setManualSource] = useState<MoveSource | null>(null);
  const [rollHistory, setRollHistory] = useState<number[]>([]);
  const [seenRollSeq, setSeenRollSeq] = useState(rollSeq);

  useEffect(() => { checkSession(); connect(); }, [checkSession, connect]);

  useEffect(() => {
    if (!room && dbUserId && roomId) {
      if (tournamentId) joinTournamentMatch(tournamentId, name || "Player", dbUserId, avatarUrl ?? undefined);
      else joinRoom(roomId, name || "Player", dbUserId, avatarUrl ?? undefined);
    }
  }, [room, dbUserId, roomId, tournamentId, name, avatarUrl, joinRoom, joinTournamentMatch]);

  useEffect(() => { if (room?.id) connectChat(room.id, room.messages); }, [room?.id, connectChat]);

  useEffect(() => {
    if (rollSeq === 0 || rollSeq === seenRollSeq || !lastRoll) return;
    setSeenRollSeq(rollSeq);
    setRollHistory((h) => [...h, lastRoll.d1, lastRoll.d2].slice(-3));
  }, [rollSeq, lastRoll, seenRollSeq]);

  if (!room) return <div className="h-[100dvh] w-screen bg-[#704326] text-white flex items-center justify-center font-black">Joining room {roomId}...</div>;

  if (!room.started) {
    if (room.tournamentId) return <TournamentWaitingRoom />;
    return <>
      <RoomLobby onOpenChat={() => { setChatOpen(true); markRead(); }} onOpenVoice={() => setVoiceOpen(true)} chatUnreadCount={unreadCount} />
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} currentSocketId={getSocket().id ?? null} />
      <VoiceChatPanel isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} players={room.players} currentSocketId={getSocket().id ?? null} />
    </>;
  }

  const gameState = room.gameState!;
  const currentSocketId = getSocket().id ?? null;
  const me = room.players.find((p) => p.socketId === currentSocketId);
  const isYourTurn = !!me && (gameState.currentTurnColor === me.color || gameState.currentTurnColor === me.teammateColor);

  const sourceEnabled: Record<MoveSource, boolean> = {
    d1: room.pendingMoves.some((m) => m.source === "d1"),
    d2: room.pendingMoves.some((m) => m.source === "d2"),
    sum: room.pendingMoves.some((m) => m.source === "sum"),
  };
  const enabledSources = (Object.keys(sourceEnabled) as MoveSource[]).filter((s) => sourceEnabled[s]);
  const activeSource = enabledSources.length <= 1 ? (enabledSources[0] ?? null) : (manualSource ?? enabledSources[0] ?? null);
  const selectableTokenIds = new Set(isYourTurn && activeSource ? room.pendingMoves.filter((m) => m.source === activeSource).map((m) => m.tokenId) : []);

  const isColorCurrentTurn = (color: PlayerColor) => gameState.teamMode
    ? (color === "RED" || color === "YELLOW" ? "RED" : "GREEN") === gameState.currentTurnColor
    : gameState.currentTurnColor === color;

  const playerNames: Partial<Record<PlayerColor, string>> = {};
  const playerAvatars: Partial<Record<PlayerColor, string | undefined>> = {};
  const emptyColors = new Set<PlayerColor>(["RED", "GREEN", "YELLOW", "BLUE"]);
  const disconnectedColors = new Set<PlayerColor>();
  room.players.forEach((p) => {
    const isMe = p.socketId === currentSocketId;
    playerNames[p.color] = isMe ? "Me" : p.name;
    playerAvatars[p.color] = p.avatarUrl;
    emptyColors.delete(p.color);
    if (p.teammateColor) {
      playerNames[p.teammateColor] = isMe ? "Me" : p.name;
      playerAvatars[p.teammateColor] = p.avatarUrl;
      emptyColors.delete(p.teammateColor);
    }
    if (!p.connected) {
      disconnectedColors.add(p.color);
      if (p.teammateColor) disconnectedColors.add(p.teammateColor);
    }
  });
  const currentTurnColors = new Set<PlayerColor>((["RED", "GREEN", "YELLOW", "BLUE"] as PlayerColor[]).filter(isColorCurrentTurn));

  const localPlayer = room.players.find((p) => p.socketId === currentSocketId);
  const opponent = room.players.find((p) => p.socketId !== currentSocketId);
  const scoreFor = (colors: PlayerColor[]) => gameState.players.filter((p) => colors.includes(p.color)).reduce((n, p) => n + p.tokens.filter((t) => t.position === 57).length, 0);
  const meColors = localPlayer ? [localPlayer.color, ...(localPlayer.teammateColor ? [localPlayer.teammateColor] : [])] : [];
  const opponentColors = opponent ? [opponent.color, ...(opponent.teammateColor ? [opponent.teammateColor] : [])] : [];
  const meScore = scoreFor(meColors);
  const opponentScore = scoreFor(opponentColors);
  const turnText = gameState.winner ? `${playerNames[gameState.winner] ?? gameState.winner} wins!` : isYourTurn ? "Your Turn" : `${playerNames[gameState.currentTurnColor] ?? "Player1"}'s Turn`;

  const handleTokenClick = (tokenId: string) => {
    const move = room.pendingMoves.find((m) => m.tokenId === tokenId && m.source === activeSource);
    if (move) selectMove(room.id, tokenId, move.toPosition);
  };
  const handleCapture = (info: { tokenId: string; color: PlayerColor }) => {
    setCaptureText(`${playerNames[info.color] ?? info.color}'s token was sent home!`);
    setTimeout(() => setCaptureText(null), 1400);
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden touch-none select-none text-white font-sans bg-[#704326]" style={{ backgroundImage: "radial-gradient(ellipse at center,rgba(255,220,160,.18),transparent 62%),repeating-linear-gradient(8deg,rgba(45,20,8,.16) 0 3px,transparent 3px 13px)" }}>
      <div className="mx-auto flex h-full w-full max-w-[760px] flex-col px-2 pt-2 pb-2">
        <header className="shrink-0">
          <div className="flex items-center justify-between">
            <button aria-label="Menu" className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/40 bg-gradient-to-br from-sky-400 to-blue-700 text-2xl shadow-[0_4px_8px_rgba(0,0,0,.45)]">☰</button>
            <div className="text-4xl drop-shadow-[0_4px_2px_rgba(0,0,0,.45)]">👆</div>
            <button aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/40 bg-gradient-to-br from-orange-400 to-red-600 text-3xl font-black shadow-[0_4px_8px_rgba(0,0,0,.45)]">×</button>
          </div>
          <div className="mt-1.5 flex justify-center gap-2">
            <div className="rounded-full border border-white/10 bg-[#063f48] px-5 py-1.5 text-sm font-black shadow-lg"><span className="text-white">Me</span>: {meScore}</div>
            <div className="rounded-full border border-white/10 bg-[#063f48] px-5 py-1.5 text-sm font-black shadow-lg"><span className="text-white">Player1</span>: {opponentScore}</div>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 flex items-center justify-center py-1">
          <div className="relative h-full w-full max-w-[720px] flex items-center justify-center">
            <div className="absolute left-1/2 top-0 z-[60] -translate-x-1/2 -translate-y-1/3">
              <DiceOverlay onRoll={() => roll(room.id)} canRoll={isYourTurn && !room.pendingRoll && !gameState.winner && !lastRoll} rollSeq={rollSeq} d1={lastRoll?.d1 ?? null} d2={lastRoll?.d2 ?? null} />
            </div>
            <FitSquare className="relative rounded-[18px] overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,.5)]" maxSize={720}>
              <Board players={gameState.players} selectableTokenIds={selectableTokenIds} playerNames={playerNames} playerAvatars={playerAvatars} emptyColors={emptyColors} disconnectedColors={disconnectedColors} currentTurnColors={currentTurnColors} onTokenClick={handleTokenClick} onMoveAnimationComplete={finishMoveAnimation} onCapture={handleCapture} />
              <CaptureToast text={captureText} />
            </FitSquare>
          </div>
        </main>

        <footer className="shrink-0 flex items-center justify-between gap-3 px-3 pt-1">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => <div key={i} className="grid h-12 w-12 place-items-center rounded-full border-2 border-white/50 bg-gradient-to-br from-sky-400 to-blue-700 text-lg font-black shadow-[0_4px_8px_rgba(0,0,0,.5)]">{rollHistory[i] ?? 0}</div>)}
          </div>
          <button type="button" disabled={!isYourTurn || !!gameState.winner} onClick={() => { if (isYourTurn && !lastRoll) roll(room.id); }} className={`rounded-full border-2 px-8 py-3 text-base font-black shadow-[0_5px_10px_rgba(0,0,0,.5)] transition active:scale-95 ${isYourTurn ? "border-emerald-300 bg-[#063f48]" : "border-white/20 bg-[#3a332e] opacity-70"}`}>{turnText}</button>
        </footer>
      </div>

      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} currentSocketId={currentSocketId} />
      <VoiceChatPanel isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} players={room.players} currentSocketId={currentSocketId} />
    </div>
  );
}
