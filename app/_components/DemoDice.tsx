"use client";
import { useState } from "react";

type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
const faces: Record<DiceFace, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function DemoDice() {
  const [value, setValue] = useState<DiceFace>(1);
  const [rolling, setRolling] = useState(false);
  const roll = () => {
    if (rolling) return;
    setRolling(true);
    window.setTimeout(() => {
      setValue((Math.floor(Math.random() * 6) + 1) as DiceFace);
      setRolling(false);
    }, 850);
  };
  return <section className="dice-area"><div className="dice-title">DICE DEMO</div><button aria-label="Roll dice" className={`dice-button ${rolling ? "rolling" : ""}`} onClick={roll}><span className="cube"><span className="face front">{Array.from({ length: 9 }, (_, i) => <i key={i}>{faces[value].includes(i) ? <b /> : null}</i>)}</span><span className="face back" /><span className="face right" /><span className="face left" /><span className="face top" /><span className="face bottom" /></span></button><div className="dice-hint">Tap the dice to roll</div><style jsx>{`.dice-area{width:100%;display:grid;place-items:center;gap:8px;padding:18px 0 4px}.dice-title{font-size:10px;letter-spacing:2px;font-weight:900;color:#64748b}.dice-button{width:112px;height:112px;border:0;background:transparent;perspective:900px;cursor:pointer;display:grid;place-items:center}.cube{position:relative;width:72px;height:72px;transform-style:preserve-3d;transform:rotateX(-18deg) rotateY(28deg);transition:transform .55s cubic-bezier(.2,.8,.2,1)}.face{position:absolute;width:72px;height:72px;border-radius:14px;border:2px solid #111;box-sizing:border-box;background:linear-gradient(145deg,#fff 0%,#e5e7eb 58%,#aeb5bf 100%);display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:9px;gap:2px;box-shadow:inset 3px 3px 5px #fff,inset -6px -7px 10px #8d96a1}.face i{display:grid;place-items:center}.face b{width:12px;height:12px;border-radius:50%;background:#111;box-shadow:inset 1px 1px 2px #555}.front{transform:translateZ(36px)}.back{transform:rotateY(180deg) translateZ(36px)}.right{transform:rotateY(90deg) translateZ(36px)}.left{transform:rotateY(-90deg) translateZ(36px)}.top{transform:rotateX(90deg) translateZ(36px)}.bottom{transform:rotateX(-90deg) translateZ(36px)}.rolling .cube{animation:diceRoll .85s cubic-bezier(.35,.05,.25,1) 1}.rolling{animation:vibrate .08s linear infinite}@keyframes diceRoll{0%{transform:rotateX(-18deg) rotateY(28deg)}50%{transform:rotateX(170deg) rotateY(205deg)}100%{transform:rotateX(342deg) rotateY(388deg)}}@keyframes vibrate{0%{transform:translate(0)}25%{transform:translate(-2px,1px)}50%{transform:translate(2px,-1px)}75%{transform:translate(-1px,-1px)}100%{transform:translate(0)}}.dice-hint{font-size:11px;color:#64748b}`}</style></section>;
}
