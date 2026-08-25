"use client";

import { useEffect, useState } from "react";
import { xpRequiredForLevel, type LevelReward, type PlayerProgress } from "../../lib/playerProgress";

type LevelUpDetail = { fromLevel: number; toLevel: number; progress: PlayerProgress; reward?: LevelReward };

export default function XPLevelCelebration() {
  const [event, setEvent] = useState<LevelUpDetail | null>(null);

  useEffect(() => {
    const onLevelUp = (e: Event) => {
      const detail = (e as CustomEvent<LevelUpDetail>).detail;
      if (detail?.toLevel > detail?.fromLevel) setEvent(detail);
    };
    const onReward = (e: Event) => {
      const reward = (e as CustomEvent<LevelReward>).detail;
      setEvent(current => current ? { ...current, reward } : current);
    };
    window.addEventListener("ludo-progression-levelup", onLevelUp);
    window.addEventListener("ludo-level-reward", onReward);
    return () => {
      window.removeEventListener("ludo-progression-levelup", onLevelUp);
      window.removeEventListener("ludo-level-reward", onReward);
    };
  }, []);

  if (!event) return null;
  const required = xpRequiredForLevel(event.toLevel);
  const nextPercent = Math.min(100, (event.progress.xp / required) * 100);
  const reward = event.reward;
  const hasReward = !!reward && (
    reward.coins > 0 || reward.gems > 0 || reward.badges.length > 0 ||
    reward.unlocks.length > 0 || reward.compensations.length > 0
  );

  return (
    <div className="xp-celebration" role="status" aria-live="polite" onAnimationEnd={(e) => {
      if ((e.target as HTMLElement).classList.contains("xp-celebration")) setEvent(null);
    }}>
      <div className="xp-confetti" aria-hidden="true">
        {Array.from({ length: 30 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}
      </div>
      <div className="xp-card">
        <div className="xp-emojis">🎊 🎉 🎊</div>
        <div className="xp-small">CONGRATULATIONS!</div>
        <h2>LEVEL UP!</h2>
        <div className="xp-levels"><span>LEVEL {event.fromLevel}</span><b>→</b><strong>LEVEL {event.toLevel}</strong></div>
        <div className="xp-bar-frame">
          <div className="xp-old-bar" />
          <div className="xp-new-bar" style={{ "--next": `${nextPercent}%` } as React.CSSProperties} />
        </div>

        {hasReward && (
          <div className="xp-reward">
            <div className="xp-reward-title">🎁 YOUR REWARD</div>
            <div className="xp-reward-items">
              {reward!.coins > 0 && <span>🪙 +{reward!.coins.toLocaleString()} Coins</span>}
              {reward!.gems > 0 && <span>💎 +{reward!.gems.toLocaleString()} Gems</span>}
              {reward!.badges.length > 0 && <span>🏆 Level {event.toLevel} Badge Earned</span>}
              {reward!.unlocks.map(item => (
                <span className="xp-unlock" key={`${item.type}:${item.id}`}>
                  {item.icon || (item.type === "board" ? "🎨" : item.type === "dice" ? "🎲" : item.type === "avatar" ? "👤" : "✨")}
                  {item.name} — UNLOCKED
                </span>
              ))}
              {reward!.compensations.map(item => (
                <span className="xp-compensation" key={`comp:${item.type}:${item.id}`}>
                  💎 {item.name} already owned — +{item.gems} Gems compensation
                </span>
              ))}
            </div>
            {reward!.unlocks.length > 0 && (
              <div className="xp-use-hint">Open Inventory → My Items to equip your new reward.</div>
            )}
            {reward!.compensations.length > 0 && (
              <div className="xp-use-hint">You already owned the milestone item, so its configured gem compensation was added to your wallet.</div>
            )}
          </div>
        )}
        <div className="xp-caption">Your XP bar filled up and your new level has begun!</div>
      </div>
      <style jsx>{`
        .xp-celebration{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:rgba(1,5,18,.78);backdrop-filter:blur(8px);animation:xp-screen 4.2s both;pointer-events:none;overflow:hidden}
        .xp-card{position:relative;width:min(92vw,480px);padding:28px 24px 24px;text-align:center;border:2px solid #facc15;border-radius:28px;background:linear-gradient(160deg,rgba(10,30,72,.98),rgba(10,8,35,.98));box-shadow:0 0 70px rgba(250,204,21,.35),0 24px 80px rgba(0,0,0,.55);animation:xp-card 4.2s both}
        .xp-emojis{font-size:34px;letter-spacing:5px;animation:xp-pop .65s .15s both}
        .xp-small{margin-top:8px;font-size:10px;letter-spacing:3px;font-weight:950;color:#facc15}
        h2{margin:4px 0 10px;font-size:40px;line-height:1;font-weight:1000;background:linear-gradient(90deg,#fff,#facc15,#fff);-webkit-background-clip:text;color:transparent}
        .xp-levels{display:flex;align-items:center;justify-content:center;gap:12px;font-size:12px;color:#9fb3d3;font-weight:900}.xp-levels b{color:#facc15;font-size:20px}.xp-levels strong{color:#fff}
        .xp-bar-frame{height:18px;margin:18px 0 10px;border-radius:999px;background:#06122d;border:1px solid rgba(255,255,255,.14);overflow:hidden;position:relative;box-shadow:inset 0 2px 7px rgba(0,0,0,.45)}
        .xp-old-bar{position:absolute;inset:0;transform-origin:left;transform:scaleX(0);background:linear-gradient(90deg,#f59e0b,#facc15);animation:xp-fill-old 1.05s .35s forwards}
        .xp-new-bar{position:absolute;left:0;top:0;bottom:0;width:var(--next);transform-origin:left;transform:scaleX(0);background:linear-gradient(90deg,#facc15,#f59e0b);animation:xp-fill-new 1.2s 1.95s forwards}
        .xp-reward{margin:13px 0 10px;padding:12px;border-radius:14px;background:rgba(250,204,21,.09);border:1px solid rgba(250,204,21,.28);animation:xp-fade 1s 1.75s both}
        .xp-reward-title{font-size:10px;letter-spacing:2px;font-weight:950;color:#facc15}.xp-reward-items{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px}.xp-reward-items span{padding:7px 9px;border-radius:9px;background:rgba(255,255,255,.07);font-size:11px;font-weight:900;color:#fff}.xp-reward-items .xp-unlock{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3)}.xp-reward-items .xp-compensation{background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.28)}.xp-use-hint{margin-top:8px;font-size:10px;line-height:1.4;color:#b9c9e5}
        .xp-caption{font-size:11px;color:#b9c9e5;animation:xp-fade 1s 2s both}
        .xp-confetti{position:absolute;inset:0;pointer-events:none}.xp-confetti i{position:absolute;left:calc((var(--i) * 3.3333333333%) + 1%);top:-8%;width:8px;height:18px;border-radius:2px;background:#facc15;transform:rotate(calc(var(--i) * 37deg));animation:confetti 3.5s calc(var(--i) * 45ms) both}.xp-confetti i:nth-child(3n){background:#ef4444}.xp-confetti i:nth-child(3n+1){background:#22c55e}.xp-confetti i:nth-child(4n){background:#38bdf8}
        @keyframes xp-fill-old{to{transform:scaleX(1)}}@keyframes xp-fill-new{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}@keyframes xp-screen{0%,8%{opacity:0}12%,88%{opacity:1}100%{opacity:0}}@keyframes xp-card{0%{opacity:0;transform:scale(.82) translateY(20px)}12%{opacity:1;transform:scale(1) translateY(0)}88%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.96) translateY(-8px)}}@keyframes xp-pop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes xp-fade{from{opacity:0}to{opacity:1}}@keyframes confetti{0%{opacity:0;transform:translate3d(0,0,0) rotate(0)}12%{opacity:1}100%{opacity:0;transform:translate3d(calc((var(--i) - 15) * 7px),110vh,0) rotate(760deg)}}
      `}</style>
    </div>
  );
}
