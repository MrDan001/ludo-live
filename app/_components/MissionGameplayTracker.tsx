"use client";

import { useEffect, useRef } from "react";
import { recordMissionEvent } from "../../lib/missionEvents";
import { recordEventActivity } from "../../lib/eventProgress";

/**
 * Mission telemetry is mounted from app/layout.tsx, so it survives client-side
 * route changes. Do not gate the listener on the pathname captured at mount:
 * doing that makes the tracker miss /game-online when the user navigates there
 * without a full document reload.
 *
 * Gameplay components already emit the ludo-audio events below. We use the
 * current pathname at event time as a safety check instead of checking it only
 * once when this component mounts.
 */
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
    const tokens = Array.isArray(saved?.tokens) ? saved.tokens : [];
    const finished = tokens.filter(
      (t: any) => t?.state === "finished" || Number(t?.position) >= 56,
    ).length;
    return finished >= 4;
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

      // A game is considered played once an actual gameplay action occurs.
      // This avoids recording play_games merely because the global tracker
      // mounted on the Home page.
      if (!started.current && ["dice", "move", "home", "win"].includes(detail)) {
        started.current = true;
        record("play_games");
      }

      if (detail === "dice") {
        record("roll_dice");

        // The dice component updates its displayed value after the click.
        // Read it after the render has settled so a six is counted reliably.
        window.setTimeout(() => {
          if (!isGamePath()) return;
          const diceValue = Number(
            document.querySelector(".dice-value")?.textContent?.trim(),
          );
          if (diceValue === 6) record("roll_sixes");
        }, 950);
      } else if (detail === "move") {
        record("move_tokens");
      } else if (detail === "home") {
        record("move_home");
      } else if (detail === "win" && !winRecorded.current) {
        // The bot board can emit the generic win sound. Only count it as a
        // player win when the saved bot match actually contains the player's
        // four finished tokens. Multiplayer/tournament winner handling uses
        // the explicit ludo-winner event below.
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
