"use client";

import { useEffect, useRef } from "react";
import { recordMissionEvent } from "../../lib/missionEvents";
import { recordEventActivity, type EventActivityKind } from "../../lib/eventProgress";

const LOCAL_GAME_PATHS = new Set(["/game", "/tournament/game"]);
type GameplayEvent = "dice" | "move" | "home" | "win";

const EVENT_ACTIVITY_KINDS = new Set<EventActivityKind>([
  "play_games",
  "win_games",
  "roll_dice",
  "move_tokens",
  "complete_games",
  "roll_sixes",
  "move_home",
]);

function isLocalGamePath() {
  return typeof window !== "undefined" && LOCAL_GAME_PATHS.has(window.location.pathname);
}

function localStorageKey() {
  if (typeof window === "undefined") return null;
  if (window.location.pathname === "/game") return "ludo-bot-match-v1";
  const tournamentId = new URLSearchParams(window.location.search).get("tournament") || "";
  return tournamentId ? `ludo-tournament-board:${tournamentId}` : null;
}

type LocalSnapshot = {
  matchId?: string;
  matchNumber?: number;
  matchOver?: boolean;
  winnerIsHuman?: boolean;
  winner?: "human" | "bot" | string | null;
  turn?: number;
  tokens?: Array<{ color?: string; state?: string; position?: number }>;
};

function readLocalSnapshot(): LocalSnapshot | null {
  try {
    const key = localStorageKey();
    if (!key) return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocalSnapshot) : null;
  } catch {
    return null;
  }
}

function localMatchKey(snapshot: LocalSnapshot | null) {
  if (!snapshot) return null;
  if (window.location.pathname === "/game") return snapshot.matchId || "local-current";
  const tournamentId = new URLSearchParams(window.location.search).get("tournament") || "tournament";
  return `${tournamentId}:${Number(snapshot.matchNumber || 1)}`;
}

function humanHomeCount(snapshot: LocalSnapshot | null) {
  const tokens = Array.isArray(snapshot?.tokens) ? snapshot.tokens : [];
  return tokens.filter((t) => {
    const humanColor = t?.color === "red" || t?.color === "yellow";
    const home = t?.state === "finished" || Number(t?.position) >= 57;
    return humanColor && home;
  }).length;
}

function record(kind: Parameters<typeof recordMissionEvent>[0], amount = 1) {
  void recordMissionEvent(kind, amount);
  if (EVENT_ACTIVITY_KINDS.has(kind as EventActivityKind)) {
    recordEventActivity(kind as EventActivityKind, amount);
  }
}

export default function MissionGameplayTracker() {
  const matchKeyRef = useRef<string | null>(null);
  const playRecordedRef = useRef(false);
  const finishRecordedRef = useRef(false);
  const winRecordedRef = useRef(false);
  const homeCountRef = useRef(0);
  const moveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const resetForMatch = (snapshot: LocalSnapshot | null) => {
      const key = localMatchKey(snapshot);
      if (key && key !== matchKeyRef.current) {
        matchKeyRef.current = key;
        playRecordedRef.current = false;
        finishRecordedRef.current = false;
        winRecordedRef.current = false;
        homeCountRef.current = humanHomeCount(snapshot);
      }
    };

    const currentSnapshot = () => {
      if (!isLocalGamePath()) return null;
      const snapshot = readLocalSnapshot();
      resetForMatch(snapshot);
      return snapshot;
    };

    const onAudio = (event: Event) => {
      if (!isLocalGamePath()) return;
      const detail = String((event as CustomEvent).detail || "") as GameplayEvent;
      if (!["dice", "move", "home", "win"].includes(detail)) return;

      const snapshot = currentSnapshot();
      if (!snapshot || snapshot.matchOver) return;

      if (!playRecordedRef.current) {
        playRecordedRef.current = true;
        record("play_games");
      }

      if (detail === "dice") {
        // Only human turns count. Bot rolls also produce the same audio event.
        if (Number(snapshot.turn) !== 0) return;
        record("roll_dice");
        if (Number.isNaN(Number(snapshot.turn))) return;
        window.setTimeout(() => {
          const after = currentSnapshot();
          if (!after || after.matchOver || Number(after.turn) !== 0) return;
          const value = Number(document.querySelector(".dice-value")?.textContent?.trim());
          if (value === 6) record("roll_sixes");
        }, 950);
        return;
      }

      if (detail === "move") {
        if (Number(snapshot.turn) !== 0) return;
        if (moveTimerRef.current !== null) return;
        moveTimerRef.current = window.setTimeout(() => {
          moveTimerRef.current = null;
        }, 450);
        record("move_tokens");
        return;
      }

      if (detail === "home") {
        window.setTimeout(() => {
          const after = currentSnapshot();
          if (!after || after.matchOver) return;
          const count = humanHomeCount(after);
          const delta = Math.max(0, count - homeCountRef.current);
          homeCountRef.current = count;
          if (delta > 0) record("move_home", delta);
        }, 350);
      }
    };

    const pollMatchState = () => {
      if (!isLocalGamePath()) return;
      const snapshot = currentSnapshot();
      if (!snapshot) return;

      if (snapshot.matchOver && !finishRecordedRef.current) {
        finishRecordedRef.current = true;
        record("complete_games");
      }

      const humanWon = window.location.pathname === "/game"
        ? Boolean(snapshot.winnerIsHuman)
        : String(snapshot.winner || "") === "human";

      if (snapshot.matchOver && humanWon && !winRecordedRef.current) {
        winRecordedRef.current = true;
        record("win_games");
      }
    };

    const interval = window.setInterval(pollMatchState, 350);
    window.addEventListener("ludo-audio", onAudio);
    return () => {
      window.removeEventListener("ludo-audio", onAudio);
      window.clearInterval(interval);
      if (moveTimerRef.current !== null) window.clearTimeout(moveTimerRef.current);
    };
  }, []);

  return null;
}
