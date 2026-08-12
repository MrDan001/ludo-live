"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Die3D from "./Die3D";

// Cosmetic-only spin time before the settled faces are revealed. By the
// time "game:rolled" (or the local store's roll) reaches this component,
// the real d1/d2 values are already known - this delay exists purely so
// the roll *feels* like it's being counted instead of snapping instantly,
// same idea the old transient overlay used.
const SPIN_MS = 550;

interface DiceOverlayProps {
  /** Tapping the tray rolls the dice - this replaces the old separate
   *  "Roll Dice" button entirely. The whole tray is the roll button. */
  onRoll: () => void;
  canRoll: boolean;
  /** Bumped on every new roll - restarts the spin from scratch. */
  rollSeq: number;
  d1: number | null;
  d2: number | null;
}

/** Permanent center-board dice tray. Unlike the old DiceOverlay, this
 *  never unmounts or fades away - it's a fixed fixture sitting in the
 *  board's middle hole the whole game, matching the reference UI where
 *  the dice visibly live there between rolls. Tap it to roll; it spins
 *  briefly then settles on the two results and stays showing them until
 *  the next roll. */
export default function DiceOverlay({ onRoll, canRoll, rollSeq, d1, d2 }: DiceOverlayProps) {
  // Die3D's cube faces are positioned with real 3D CSS transforms
  // (translateZ, perspective) - those need actual pixels, percentages
  // don't work for them. So instead of a fixed pixel size, measure the
  // tray's own rendered width (which DOES scale fluidly with the board
  // via the "19%" style below) and derive the die size from that -
  // keeping the dice visually in proportion no matter how big or small
  // the board ends up being on a given screen.
  const trayRef = useRef<HTMLButtonElement>(null);
  const [trayPx, setTrayPx] = useState(0);

  useLayoutEffect(() => {
    const el = trayRef.current;
    if (!el) return;
    const measure = () => setTrayPx(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Render-time "reset on prop change" pattern (see React docs) instead of
  // an effect that calls setState synchronously the moment rollSeq
  // changes - a new rollSeq means a new roll just happened, so flip into
  // the spinning state immediately, during this same render.
  const [seenRollSeq, setSeenRollSeq] = useState(rollSeq);
  const [spinning, setSpinning] = useState(false);
  const [hasRolledOnce, setHasRolledOnce] = useState(false);

  if (rollSeq !== seenRollSeq) {
    setSeenRollSeq(rollSeq);
    setSpinning(true);
    setHasRolledOnce(true);
  }

  // The actual side effect - scheduling the spin to stop - stays in an
  // effect, but only ever calls setState inside the deferred timeout
  // callback, never synchronously in the effect body itself.
  useEffect(() => {
    if (rollSeq === 0) return;
    const t = setTimeout(() => setSpinning(false), SPIN_MS);
    return () => clearTimeout(t);
  }, [rollSeq]);

  const faceOrPlaceholder = (face: number | null) => face ?? 1;
  // Two dice always sit in the tray, before the first roll included -
  // matching the reference, which never shows just one. Size is measured
  // from the tray's own rendered width so it scales with the board.
  const dieSize = trayPx > 0 ? Math.round(trayPx * 0.42) : 20;

  return (
    // pointer-events-none on the wrapper - inset-0 makes this div's hit
    // box cover the WHOLE board, not just the visible tray in the middle,
    // and without this it was silently swallowing every tap anywhere on
    // the board (tokens included) except the one spot the button actually
    // sits. pointer-events-auto on the button opts it back in.
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <button
        ref={trayRef}
        type="button"
        onClick={() => canRoll && onRoll()}
        disabled={!canRoll}
        aria-label="Roll dice"
        className={[
          "pointer-events-auto relative flex items-center justify-center gap-[8%] rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_4px_10px_rgba(0,0,0,0.5)] border-2 transition-transform active:scale-95",
          canRoll ? "border-amber-400/70 cursor-pointer" : "border-amber-900/60 cursor-default",
          !hasRolledOnce && canRoll ? "animate-pulse" : "",
        ].join(" ")}
        style={{
          width: "19%",
          aspectRatio: "1 / 1",
          background: "radial-gradient(circle at 35% 30%, #2f7db0, #1a4c6e 70%)",
        }}
      >
        <Die3D face={faceOrPlaceholder(d1)} spinning={spinning} size={dieSize} />
        <Die3D face={faceOrPlaceholder(d2)} spinning={spinning} size={dieSize} />
      </button>
    </div>
  );
}
