"use client";

import { useEffect, useRef } from "react";
import { recordMissionEvent } from "../../lib/missionEvents";
import { recordEventActivity } from "../../lib/eventProgress";

const GAME_PATHS = new Set(["/game", "/game-online", "/tournament/game"]);
type GameplayEvent = "dice" | "move" | "home" | "win";

function isGamePath() {
  return typeof window !== "undefined" && GAME_PATHS.has(window.location.pathname);
}

function record(kind: Parameters<typeof recordMissionEvent>[0], amount = 1) {
  void recordMissionEvent(kind, amount);
  recordEventActivity(kind);
}

function botPlayerWon() {
  try {
    const saved = JSON.parse(localStorage.getItem("ludo-bot-match-v1") || "null");
    return Boolean(saved?.matchOver && saved?.winnerIsHuman);
  } catch {
    return false;
  }
}

export default function MissionGameplayTracker() {
  const started = useRef(false);
  const winRecorded = useRef(false);

  useEffect(() => {
    const onAudio = (event: Event) => {
      if (!isGamePath()) return;
      const detail = String((event as CustomEvent).detail || "") as GameplayEvent;

      // The tracker is mounted globally. Record a game only after a real
      // gameplay action, not when the Home page mounts.
      if (!started.current && ["dice", "move", "home", "win"].includes(detail)) {
        started.current = true;
        record("play_games");
      }

      if (detail === "dice") {
        record("roll_dice");
        window.setTimeout(() => {
          if (!isGamePath()) return;
          const diceValue = Number(document.querySelector(".dice-value")?.textContent?.trim());
          if (diceValue === 6) record("roll_sixes");
        }, 950);
      } else if (detail === "move") {
        record("move_tokens");
      } else if (detail === "home") {
        record("move_home");
      } else if (detail === "win" && !winRecorded.current) {
        // /game's generic win sound is also used by the winner UI. Confirm
        // that the saved bot match says the human won before counting it.
        if (window.location.pathname === "/game" && !botPlayerWon()) return;
        winRecorded.current = true;
        record("win_games");
        record("complete_games");
      }
    };

    const onWinner = (event: Event) => {
      if (!isGamePath() || winRecorded.current) return;
      const detail = (event as CustomEvent<{ winnerName?: string }>).detail || {};
      if (String(detail.winnerName || "").trim().toLowerCase() !== "you") return;
      winRecorded.current = true;
      record("win_games");
      record("complete_games");
    };

    window.addEventListener("ludo-audio", onAudio);
    window.addEventListener("ludo-winner", onWinner);
    return () => {
      window.removeEventListener("ludo-audio", onAudio);
      window.removeEventListener("ludo-winner", onWinner);
    };
  }, []);

  return null;
}
