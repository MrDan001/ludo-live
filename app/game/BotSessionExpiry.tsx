"use client";

import { useLayoutEffect } from "react";

const SAVE_KEY = "ludo-bot-match-v1";
const ABSENCE_KEY = "ludo-bot-match-absence-v1";
const ABSENCE_LIMIT_MS = 60_000;

export default function BotSessionExpiry() {
  useLayoutEffect(() => {
    let hiddenAt = 0;
    try {
      const raw = localStorage.getItem(ABSENCE_KEY);
      const leftAt = raw ? Number(raw) : 0;
      if (leftAt && Date.now() - leftAt >= ABSENCE_LIMIT_MS) {
        localStorage.removeItem(SAVE_KEY);
      }
      localStorage.removeItem(ABSENCE_KEY);
    } catch {}

    const markAway = () => {
      try {
        localStorage.setItem(ABSENCE_KEY, String(Date.now()));
      } catch {}
    };

    const markBack = () => {
      if (!hiddenAt) return;
      const awayFor = Date.now() - hiddenAt;
      hiddenAt = 0;
      try {
        if (awayFor >= ABSENCE_LIMIT_MS) localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(ABSENCE_KEY);
      } catch {}
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        markAway();
      } else {
        markBack();
      }
    };

    const onPageHide = () => markAway();
    const onPageShow = () => markBack();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
