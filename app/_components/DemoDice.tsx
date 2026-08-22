"use client";

import { useEffect, useRef, useState } from "react";
import { DICE_STYLES, type DiceSkinId } from "./LudoDice";

type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
type Props = { value: DiceFace; onRoll: (value: DiceFace) => void; disabled?: boolean; botRolling?: boolean };

const pips: Record<DiceFace, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const validSkins: DiceSkinId[] = ["classic","golden","crystal","fire","rainbow","diamond","skull","sports","neon","galaxy","love"];

function Face({ value, className = "", skin }: { value: DiceFace; className?: string; skin: DiceSkinId }) {
  return <span className={`face ${className}`} aria-hidden="true" style={{ background: DICE_STYLES[skin] }}>{Array.from({ length: 9 }, (_, index) => <i key={index}>{pips[value].includes(index) ? <b /> : null}</i>)}</span>;
}

export default function DemoDice({ value, onRoll, disabled = false, botRolling = false }: Props) {
  const [rolling, setRolling] = useState(false);
  const [shown, setShown] = useState<DiceFace>(value);
  const [skin, setSkin] = useState<DiceSkinId>("classic");
  const previousValue = useRef(value);
  const interactionLock = useRef(false);

  useEffect(() => {
    let alive = true;
    const loadSkin = async () => {
      try { const stored = localStorage.getItem("ludo-match-dice") as DiceSkinId | null; if (stored && validSkins.includes(stored)) setSkin(stored); } catch {}
      try { const r = await fetch("/api/customization", { cache: "no-store" }); const data = await r.json(); const equipped = data?.equippedDice as DiceSkinId; if (alive && validSkins.includes(equipped)) setSkin(equipped); } catch {}
    };
    loadSkin();
    return () => { alive = false; };
  }, []);

  // Release the local input lock only after the parent has released its disabled state.
  // This prevents a second roll while a legal token action is still pending.
  useEffect(() => {
    if (!disabled && !botRolling) interactionLock.current = false;
  }, [disabled, botRolling]);

  // The parent controls the bot roll duration. Keeping this effect state-driven
  // prevents the animation from being cancelled when the bot turn state changes.
  useEffect(() => {
    if (botRolling) {
      setRolling(true);
      return;
    }
    setShown(value);
    setRolling(false);
    previousValue.current = value;
  }, [botRolling, value]);

  const roll = () => {
    if (rolling || disabled || interactionLock.current) return;
    interactionLock.current = true;
    setRolling(true);
    const next = (Math.floor(Math.random() * 6) + 1) as DiceFace;
    window.setTimeout(() => { setShown(next); onRoll(next); setRolling(false); }, 900);
  };

  return <section className="dice-area" aria-label="Dice">
    <button type="button" aria-label="Roll dice" className={`dice-button ${rolling ? "rolling" : ""}`} onClick={roll} disabled={disabled || rolling}>
      <span className="dice-shadow" aria-hidden="true" /><span className="cube-wrap" aria-hidden="true"><span className="cube">
        <Face value={shown} className="front" skin={skin} /><Face value={6} className="back" skin={skin} /><Face value={3} className="right" skin={skin} /><Face value={4} className="left" skin={skin} /><Face value={5} className="top" skin={skin} /><Face value={2} className="bottom" skin={skin} />
      </span></span>
    </button>
    <div className="dice-value">{rolling ? "Rolling…" : shown}</div><div className="dice-hint">Tap the dice to roll</div>
    <style jsx>{`
      .dice-area{display:grid;place-items:center;gap:5px;min-width:150px}.dice-button{position:relative;width:138px;height:124px;border:0;background:transparent;padding:0;display:grid;place-items:center;perspective:1000px;cursor:pointer;touch-action:manipulation}.dice-button:disabled{cursor:default}.cube-wrap{position:relative;width:82px;height:82px;display:block;perspective:1000px;transform:translateY(-2px)}.cube{position:absolute;inset:0;width:82px;height:82px;transform-style:preserve-3d;transform:rotateX(-10deg) rotateY(18deg)}:global(.face){position:absolute;inset:0;width:82px;height:82px;box-sizing:border-box;border:2px solid #111;border-radius:17%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:9px;gap:2px;backface-visibility:visible;box-shadow:inset 3px 3px 5px rgba(255,255,255,.95),inset -7px -8px 11px rgba(80,90,100,.28),0 3px 5px rgba(0,0,0,.18)}:global(.face i){display:grid;place-items:center}:global(.face b){display:block;width:12px;height:12px;border-radius:50%;background:#111;box-shadow:inset 1px 1px 2px rgba(255,255,255,.35),0 1px 2px rgba(0,0,0,.35)}:global(.front){transform:translateZ(41px)}:global(.back){transform:rotateY(180deg) translateZ(41px)}:global(.right){transform:rotateY(90deg) translateZ(41px)}:global(.left){transform:rotateY(-90deg) translateZ(41px)}:global(.top){transform:rotateX(90deg) translateZ(41px)}:global(.bottom){transform:rotateX(-90deg) translateZ(41px)}.dice-shadow{position:absolute;width:70px;height:15px;bottom:10px;border-radius:50%;background:rgba(0,0,0,.22);filter:blur(7px)}.rolling .cube{animation:diceTumble .9s cubic-bezier(.25,.75,.25,1) 1}.rolling .cube-wrap{animation:diceBounce .9s cubic-bezier(.25,.75,.25,1) 1}.rolling .dice-shadow{animation:shadowPulse .9s ease-in-out 1}@keyframes diceTumble{0%{transform:rotateX(-10deg) rotateY(18deg) rotateZ(0deg)}18%{transform:rotateX(95deg) rotateY(108deg) rotateZ(-3deg)}36%{transform:rotateX(205deg) rotateY(198deg) rotateZ(3deg)}54%{transform:rotateX(315deg) rotateY(288deg) rotateZ(-2deg)}72%{transform:rotateX(430deg) rotateY(378deg) rotateZ(2deg)}88%{transform:rotateX(535deg) rotateY(468deg) rotateZ(-1deg)}100%{transform:rotateX(710deg) rotateY(738deg) rotateZ(0deg)}}@keyframes diceBounce{0%,100%{transform:translateY(-2px)}35%{transform:translateY(-10px)}60%{transform:translateY(0)}78%{transform:translateY(-4px)}}@keyframes shadowPulse{0%,100%{transform:scaleX(1);opacity:.22}35%{transform:scaleX(.72);opacity:.14}60%{transform:scaleX(1.05);opacity:.25}78%{transform:scaleX(.9);opacity:.18}}.dice-value{min-height:20px;font-size:16px;font-weight:950;color:#e5edf8}.dice-hint{font-size:10px;color:#9fb5d8}@media(max-width:480px){.dice-button{width:132px;height:120px}.cube-wrap,.cube,:global(.face){width:78px;height:78px}:global(.front){transform:translateZ(39px)}:global(.back){transform:rotateY(180deg) translateZ(39px)}:global(.right){transform:rotateY(90deg) translateZ(39px)}:global(.left){transform:rotateY(-90deg) translateZ(39px)}:global(.top){transform:rotateX(90deg) translateZ(39px)}:global(.bottom){transform:rotateX(-90deg) translateZ(39px)}}
    `}</style>
  </section>;
}
