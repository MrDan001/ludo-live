"use client";

import { useEffect, useState } from "react";

type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
type Props = { value: DiceFace; onRoll: (value: DiceFace) => void; disabled?: boolean };

const pips: Record<DiceFace, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Face({ value, className = "" }: { value: DiceFace; className?: string }) {
  return (
    <span className={`face ${className}`} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <i key={index}>{pips[value].includes(index) ? <b /> : null}</i>
      ))}
    </span>
  );
}

export default function DemoDice({ value, onRoll, disabled = false }: Props) {
  const [rolling, setRolling] = useState(false);
  const [shown, setShown] = useState<DiceFace>(value);

  useEffect(() => {
    if (!rolling) setShown(value);
  }, [value, rolling]);

  const roll = () => {
    if (rolling || disabled) return;

    setRolling(true);
    const next = (Math.floor(Math.random() * 6) + 1) as DiceFace;

    // Keep the result hidden until the physical tumble has completed.
    window.setTimeout(() => {
      setShown(next);
      onRoll(next);
      setRolling(false);
    }, 900);
  };

  return (
    <section className="dice-area" aria-label="Dice">
      <button
        type="button"
        aria-label="Roll dice"
        className={`dice-button ${rolling ? "rolling" : ""}`}
        onClick={roll}
        disabled={disabled || rolling}
      >
        <span className="dice-shadow" aria-hidden="true" />
        <span className="cube-wrap" aria-hidden="true">
          <span className="cube">
            {/* Every physical face has its own complete pip layout. */}
            <Face value={shown} className="front" />
            <Face value={6} className="back" />
            <Face value={3} className="right" />
            <Face value={4} className="left" />
            <Face value={5} className="top" />
            <Face value={2} className="bottom" />
          </span>
        </span>
      </button>
      <div className="dice-value">{rolling ? "Rolling…" : shown}</div>
      <div className="dice-hint">Tap the dice to roll</div>

      <style jsx>{`
        .dice-area {
          display: grid;
          place-items: center;
          gap: 5px;
          min-width: 150px;
        }
        .dice-button {
          position: relative;
          width: 138px;
          height: 124px;
          border: 0;
          background: transparent;
          padding: 0;
          display: grid;
          place-items: center;
          perspective: 1000px;
          cursor: pointer;
          touch-action: manipulation;
        }
        .dice-button:disabled { cursor: default; }
        .cube-wrap {
          position: relative;
          width: 82px;
          height: 82px;
          display: block;
          perspective: 1000px;
          transform: translateY(-2px);
        }
        .cube {
          position: absolute;
          inset: 0;
          width: 82px;
          height: 82px;
          transform-style: preserve-3d;
          transform: rotateX(-10deg) rotateY(18deg);
        }
        .face {
          position: absolute;
          inset: 0;
          width: 82px;
          height: 82px;
          box-sizing: border-box;
          border: 2px solid #111;
          border-radius: 17%;
          background: linear-gradient(145deg, #ffffff 0%, #eef2f5 54%, #b8c1ca 100%);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          padding: 9px;
          gap: 2px;
          backface-visibility: visible;
          box-shadow:
            inset 3px 3px 5px rgba(255,255,255,.95),
            inset -7px -8px 11px rgba(80,90,100,.28),
            0 3px 5px rgba(0,0,0,.18);
        }
        .face i {
          display: grid;
          place-items: center;
        }
        .face b {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #111;
          box-shadow:
            inset 1px 1px 2px rgba(255,255,255,.35),
            0 1px 2px rgba(0,0,0,.35);
        }
        .front  { transform: translateZ(41px); }
        .back   { transform: rotateY(180deg) translateZ(41px); }
        .right  { transform: rotateY(90deg) translateZ(41px); }
        .left   { transform: rotateY(-90deg) translateZ(41px); }
        .top    { transform: rotateX(90deg) translateZ(41px); }
        .bottom { transform: rotateX(-90deg) translateZ(41px); }
        .dice-shadow {
          position: absolute;
          width: 70px;
          height: 15px;
          bottom: 10px;
          border-radius: 50%;
          background: rgba(0,0,0,.22);
          filter: blur(7px);
        }
        .rolling .cube {
          animation: diceTumble .9s cubic-bezier(.25,.75,.25,1) 1;
        }
        .rolling .cube-wrap {
          animation: diceBounce .9s cubic-bezier(.25,.75,.25,1) 1;
        }
        .rolling .dice-shadow {
          animation: shadowPulse .9s ease-in-out 1;
        }
        @keyframes diceTumble {
          0%   { transform: rotateX(-10deg) rotateY(18deg) rotateZ(0deg); }
          18%  { transform: rotateX(95deg) rotateY(108deg) rotateZ(-3deg); }
          36%  { transform: rotateX(205deg) rotateY(198deg) rotateZ(3deg); }
          54%  { transform: rotateX(315deg) rotateY(288deg) rotateZ(-2deg); }
          72%  { transform: rotateX(430deg) rotateY(378deg) rotateZ(2deg); }
          88%  { transform: rotateX(535deg) rotateY(468deg) rotateZ(-1deg); }
          100% { transform: rotateX(710deg) rotateY(738deg) rotateZ(0deg); }
        }
        @keyframes diceBounce {
          0%,100% { transform: translateY(-2px); }
          35% { transform: translateY(-10px); }
          60% { transform: translateY(0); }
          78% { transform: translateY(-4px); }
        }
        @keyframes shadowPulse {
          0%,100% { transform: scaleX(1); opacity: .22; }
          35% { transform: scaleX(.72); opacity: .14; }
          60% { transform: scaleX(1.05); opacity: .25; }
        }
        .dice-value {
          min-height: 20px;
          font-size: 16px;
          font-weight: 950;
          color: #e5edf8;
        }
        .dice-hint {
          font-size: 10px;
          color: #9fb5d8;
        }
        @media (max-width: 480px) {
          .dice-button { width: 132px; height: 120px; }
          .cube-wrap, .cube, .face { width: 78px; height: 78px; }
          .front { transform: translateZ(39px); }
          .back { transform: rotateY(180deg) translateZ(39px); }
          .right { transform: rotateY(90deg) translateZ(39px); }
          .left { transform: rotateY(-90deg) translateZ(39px); }
          .top { transform: rotateX(90deg) translateZ(39px); }
          .bottom { transform: rotateX(-90deg) translateZ(39px); }
        }
      `}</style>
    </section>
  );
}
