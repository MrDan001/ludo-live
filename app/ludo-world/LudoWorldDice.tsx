"use client";

import { useEffect, useRef, useState } from "react";

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

function Face({ value }: { value: DiceFace }) {
  return (
    <span className="lw7-dice-face">
      {Array.from({ length: 9 }, (_, index) => <i key={index}>{PIPS[value].includes(index) ? <b /> : null}</i>)}
    </span>
  );
}

export default function LudoWorldDice({ value, onRoll, rolling = false, disabled = false }: Props) {
  const [display, setDisplay] = useState<DiceFace>(value ?? 1);
  const [humanRolling, setHumanRolling] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lockedRef = useRef(false);
  const humanRef = useRef(false);

  useEffect(() => {
    if (rolling) return;
    if (!humanRef.current && value) setDisplay(value);
  }, [rolling, value]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!rolling) return;
    humanRef.current = false;
    setHumanRolling(false);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setDisplay(randomFace()), 95);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [rolling]);

  const roll = () => {
    if (disabled || lockedRef.current || rolling || humanRolling) return;
    lockedRef.current = true;
    humanRef.current = true;
    setHumanRolling(true);
    const final = randomFace();
    const started = Date.now();
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setDisplay(randomFace()), 90);
    window.setTimeout(() => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      setDisplay(final);
      setHumanRolling(false);
      humanRef.current = false;
      lockedRef.current = false;
      void started;
      onRoll(final);
    }, 880);
  };

  const isRolling = rolling || humanRolling;
  return (
    <section className="lw7-dice" aria-label="Ludo World dice">
      <button type="button" className={`lw7-dice-button ${isRolling ? "is-rolling" : ""}`} onClick={roll} disabled={disabled || isRolling} aria-label="Roll dice">
        <span className="lw7-dice-shadow" />
        <span className="lw7-dice-cube-wrap"><span className="lw7-dice-cube"><Face value={display} /></span></span>
      </button>
      <strong className="lw7-dice-value">{isRolling ? "Rolling…" : (value ?? display)}</strong>
      <span className="lw7-dice-hint">{isRolling ? "Rolling before the move starts" : "Tap the dice to roll"}</span>
    </section>
  );
}
