"use client";

import { useEffect, useRef } from "react";
import { awardServerXP, syncProgressFromUser } from "../../lib/playerProgress";

export default function XPWinWatcher() {
  const initialized = useRef(false);
  const botWasWon = useRef(false);
  const tournamentWins = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const scan = async () => {
      if (cancelled) return;
      try {
        const auth = await fetch("/api/auth", { cache: "no-store" }).then(r => r.json());
        if (auth?.user) syncProgressFromUser(auth.user);
      } catch {}

      let botWon = false;
      try {
        const raw = localStorage.getItem("ludo-bot-match-v1");
        if (raw) { const state = JSON.parse(raw); botWon = Boolean(state?.matchOver && state?.winnerIsHuman); }
      } catch {}

      const tournamentNow: Record<string, boolean> = {};
      try {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i) || "";
          if (!key.startsWith("ludo-tournament-board:")) continue;
          try { tournamentNow[key] = JSON.parse(localStorage.getItem(key) || "null")?.winner === "human"; } catch {}
        }
      } catch {}

      if (!initialized.current) {
        botWasWon.current = botWon;
        tournamentWins.current = tournamentNow;
        initialized.current = true;
        return;
      }

      if (botWon && !botWasWon.current) await awardServerXP(7, "game_win");
      for (const [key, won] of Object.entries(tournamentNow)) {
        if (won && !tournamentWins.current[key]) await awardServerXP(7, "game_win");
      }
      botWasWon.current = botWon;
      tournamentWins.current = tournamentNow;
    };
    const timer = window.setInterval(() => { void scan(); }, 3000);
    void scan();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  return null;
}
