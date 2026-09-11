"use client";

import React, { useEffect, useRef, useState } from "react";
import { DICE_STYLES } from "../_components/LudoDice";

type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;
type Props = {
  value: DiceFace | null;
  onRoll: (value: DiceFace) => void;
  rolling?: boolean;
  disabled?: boolean;
};

const PIPS: Record<DiceFace, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const randomFace = (): DiceFace => (Math.floor(Math.random() * 6) + 1) as DiceFace;

function Face({ value, className }: { value: DiceFace; className: string }) {
  return (
    <span className={`lw7-dice-face ${className}`} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => <i key={index}>{PIPS[value].includes(index) ? <b /> : null}</i>)}
    </span>
  );
}

export default function LudoWorldDice({ value, onRoll, rolling = false, disabled = false }: Props) {
  const [display, setDisplay] = useState<DiceFace>(value ?? 1);
  const [humanRolling, setHumanRolling] = useState(false);
  const timerRef = useRef<number | null>(null);
  const endRef = useRef<number | null>(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!rolling && !humanRolling && value != null) setDisplay(value);
  }, [rolling, humanRolling, value]);

  useEffect(() => {
    if (!rolling) return;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setDisplay(randomFace()), 85);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [rolling]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (endRef.current !== null) window.clearTimeout(endRef.current);
  }, []);

  const roll = () => {
    if (disabled || rolling || humanRolling || lockedRef.current) return;
    lockedRef.current = true;
    setHumanRolling(true);
    const final = randomFace();
    setDisplay(final);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setDisplay(randomFace()), 85);
    endRef.current = window.setTimeout(() => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      setDisplay(final);
      setHumanRolling(false);
      lockedRef.current = false;
      onRoll(final);
    }, 900);
  };

  const isRolling = rolling || humanRolling;
  const diceSkin = DICE_STYLES.classic;

  return (
    <section className="lw7-dice" aria-label="Ludo World dice">
      <button type="button" className={`lw7-dice-button ${isRolling ? "is-rolling" : ""}`} onClick={roll} disabled={disabled || isRolling} aria-label="Roll dice">
        <span className="lw7-dice-shadow" />
        <span className="lw7-dice-cube-wrap">
          <span className="lw7-dice-cube" style={{ "--dice-skin": diceSkin } as React.CSSProperties}>
            <Face value={display} className="front" />
            <Face value={6} className="back" />
            <Face value={3} className="right" />
            <Face value={4} className="left" />
            <Face value={5} className="top" />
            <Face value={2} className="bottom" />
          </span>
        </span>
      </button>
      <strong className="lw7-dice-value">{isRolling ? "Rolling…" : (value ?? display)}</strong>
      <span className="lw7-dice-hint">{isRolling ? "Rolling before the move starts" : "Tap the dice to roll"}</span>
    </section>
  );
}
