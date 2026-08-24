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
      <style jsx>{` .winner-celebration{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at center,rgba(255,215,70,.08),transparent 58%);animation:wcIn .35s ease-out both}.winner-card{pointer-events:auto;text-align:center;padding:18px 20px 20px;max-width:min(560px,92vw);background:rgba(3,8,20,.28);border:0;box-shadow:0 22px 90px rgba(0,0,0,.32);backdrop-filter:blur(2px);animation:wcPop .65s cubic-bezier(.2,1.35,.3,1) both}.winner-trophy{font-size:clamp(64px,18vw,118px);line-height:.85;filter:drop-shadow(0 8px 24px rgba(255,210,50,.5));animation:wcTrophy 1s ease-in-out infinite alternate}.winner-kicker{margin-top:12px;font-size:11px;font-weight:1000;letter-spacing:4px;color:#ffe27a;text-shadow:0 3px 16px #000}h2{margin:6px 0 2px;font-size:clamp(30px,8vw,58px);font-weight:1000;letter-spacing:-1px;color:#fff;text-shadow:0 5px 26px rgba(0,0,0,.85),0 0 28px rgba(255,215,70,.42)}p{margin:0 0 18px;font-size:clamp(16px,4vw,24px);font-weight:800;color:#fff;text-shadow:0 3px 15px #000}.winner-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.winner-actions button{border:0;border-radius:999px;padding:13px 22px;font-weight:1000;letter-spacing:1px;background:#fff;color:#101828;box-shadow:0 10px 30px rgba(0,0,0,.28);cursor:pointer}.winner-actions .secondary{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.4)}.winner-confetti{position:absolute;inset:8% 2%;font-size:clamp(24px,7vw,58px);letter-spacing:clamp(8px,4vw,34px);line-height:2.1;text-align:center;opacity:.88;animation:wcConfetti 1.1s ease-in-out infinite alternate;filter:drop-shadow(0 5px 12px rgba(0,0,0,.5))}@keyframes wcIn{from{opacity:0}to{opacity:1}}@keyframes wcPop{from{transform:scale(.55);opacity:0}to{transform:scale(1);opacity:1}}@keyframes wcTrophy{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-7px) rotate(3deg)}}@keyframes wcConfetti{from{transform:translateY(-8px) scale(.98)}to{transform:translateY(8px) scale(1.02)}} `}</style>
    </div>
  );
}
