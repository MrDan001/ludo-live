"use client";

import { useEffect, useRef } from "react";
import { recordMissionEvent } from "../../lib/missionEvents";
import { recordEventActivity } from "../../lib/eventProgress";

const GAME_PATHS = ["/game", "/game-online", "/tournament/game"];

export default function MissionGameplayTracker() {
  const started = useRef(false);
  const winRecorded = useRef(false);

  useEffect(() => {
    if (!GAME_PATHS.some((path) => window.location.pathname === path)) return;

    if (!started.current) {
      started.current = true;
      recordMissionEvent("play_games");
      recordEventActivity("play_games");
    }

    const onAudio = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail === "dice") {
        recordMissionEvent("roll_dice");
        recordEventActivity("roll_dice");
        window.setTimeout(() => {
          const diceValue = Number(document.querySelector(".dice-value")?.textContent?.trim());
          if (diceValue === 6) {
            recordMissionEvent("roll_sixes");
            recordEventActivity("roll_sixes");
          }
        }, 950);
      } else if (detail === "move") {
        recordMissionEvent("move_tokens");
        recordEventActivity("move_tokens");
      } else if (detail === "home") {
        recordMissionEvent("move_home");
        recordEventActivity("move_home");
      } else if (detail === "win" && !winRecorded.current) {
        winRecorded.current = true;
        recordMissionEvent("win_games");
        recordMissionEvent("complete_games");
        recordEventActivity("win_games");
        recordEventActivity("complete_games");
      }
    };

    window.addEventListener("ludo-audio", onAudio);
    return () => window.removeEventListener("ludo-audio", onAudio);
  }, []);

  return null;
}
