"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "bot" | "2p" | "4p" | "tournament";
type WinnerEvent = { winnerName?: string; mode?: Mode; tournament?: boolean };

export default function WinnerCelebration() {
  const [winner, setWinner] = useState<WinnerEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    const show = (detail: WinnerEvent = {}) => {
      if (shown.current) return;
      shown.current = true;
      setWinner(detail);
      setVisible(true);
      try { window.dispatchEvent(new CustomEvent("ludo-audio", { detail: "win" })); } catch {}
      window.setTimeout(() => setVisible(false), 6500);
    };

    const onWinner = (event: Event) => show((event as CustomEvent<WinnerEvent>).detail || {});
    const onAudio = (event: Event) => {
      if (String((event as CustomEvent).detail || "") !== "win") return;
      try {
        const saved = JSON.parse(localStorage.getItem("ludo-bot-match-v1") || "null");
        const tokens = Array.isArray(saved?.tokens) ? saved.tokens : [];
        const finished = tokens.filter((t: any) => t?.state === "finished" || Number(t?.position) >= 56).length;
        if (finished >= 8) show({ mode: "bot", winnerName: "You" });
      } catch {}
    };

    const observer = new MutationObserver(() => {
      const text = document.body?.innerText || "";
      if (!/MATCH FINISHED|MATCH WON/.test(text)) return;
      const params = new URLSearchParams(window.location.search);
      const tournament = params.has("tournament");
      const mode: Mode = tournament ? "tournament" : Number(params.get("size")) === 2 ? "2p" : "4p";
      show({ mode, tournament });
    });

    window.addEventListener("ludo-winner", onWinner);
    window.addEventListener("ludo-audio", onAudio);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => { window.removeEventListener("ludo-winner", onWinner); window.removeEventListener("ludo-audio", onAudio); observer.disconnect(); };
  }, []);

  if (!visible || !winner) return null;
  const tournament = winner.mode === "tournament" || winner.tournament;
  const roomReturn = winner.mode === "4p";
  const title = tournament ? "CONGRATULATIONS! 🎉" : "CONGRATULATIONS! 👏🎉";
  const subtitle = winner.winnerName ? `${winner.winnerName} is the winner! 🏆` : "YOU ARE THE WINNER! 🏆";

  return (
    <div className="winner-celebration" role="dialog" aria-modal="true" aria-label="Winner celebration">
      <div className="winner-confetti" aria-hidden="true">🎉 ✨ 🎊 👏 🏆 ✨ 🎉</div>
      <div className="winner-card">
        <div className="winner-trophy">🏆</div><div className="winner-kicker">MATCH WINNER</div><h2>{title}</h2><p>{subtitle}</p>
        <div className="winner-actions">
          {tournament ? <button type="button" onClick={() => { window.location.href = "/tournament"; }}>TOURNAMENT</button> : roomReturn ? <button type="button" onClick={() => { window.location.href = "/room"; }}>BACK TO GAME ROOM</button> : <><button type="button" onClick={() => { window.location.reload(); }}>REPLAY</button><button type="button" className="secondary" onClick={() => { window.location.href = "/home"; }}>QUIT</button></>}
        </div>
      </div>
      <style jsx>{``,}
    </div>
  );
}
