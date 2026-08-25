"use client";

import { useEffect, useRef } from "react";
import { awardServerXP } from "../../lib/playerProgress";

export default function XPWinWatcher() {
  const initialized = useRef(false);
  const botWasWon = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const scan = async () => {
      if (cancelled) return;
      let botWon = false;
      try {
        const raw = localStorage.getItem("ludo-bot-match-v1");
        if (raw) {
          const state = JSON.parse(raw);
          botWon = Boolean(state?.matchOver && state?.winnerIsHuman);
        }
      } catch {}
      if (!initialized.current) {
        botWasWon.current = botWon;
        initialized.current = true;
        return;
      }
      if (botWon && !botWasWon.current) await awardServerXP(7, "game_win");
      botWasWon.current = botWon;
    };
    const timer = window.setInterval(() => { void scan(); }, 600);
    void scan();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  return null;
}
