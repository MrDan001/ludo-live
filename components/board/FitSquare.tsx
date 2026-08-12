"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface FitSquareProps {
  children: ReactNode;
  /** Upper bound in px so it doesn't become enormous on a tablet/desktop
   *  window - has no effect on typical phone screens, which will always
   *  hit the width or height limit first. */
  maxSize?: number;
  className?: string;
}

/** Measures the real available space with ResizeObserver and renders its
 *  children in a square sized to exactly fill whichever dimension (width
 *  or height) is tighter - then centers that square.
 *
 *  This replaces an earlier attempt that tried to get the same result
 *  from CSS alone (flex-grow + aspect-ratio + self-center). That's a
 *  real, documented CSS pattern, but it depends on a specific interaction
 *  between flexbox sizing and aspect-ratio resolution that turned out not
 *  to behave the same way across the actual devices being tested on -
 *  the board kept coming out much smaller than the space really
 *  available. Measuring the container directly in JS and setting an
 *  explicit pixel size removes that ambiguity entirely: whatever this
 *  measures IS the space available, no browser-specific CSS resolution
 *  to second-guess.
 *
 *  Usage: wrap this around your square content inside a flex column
 *  where THIS component itself should be given `flex-1 min-h-0` by its
 *  parent, so there's real leftover space here to measure in the first
 *  place. */
export default function FitSquare({ children, maxSize = 560, className }: FitSquareProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize(Math.max(0, Math.floor(Math.min(w, h, maxSize))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxSize]);

  return (
    <div ref={outerRef} className="flex-1 min-h-0 w-full flex items-center justify-center">
      {size > 0 && (
        <div className={className} style={{ width: size, height: size }}>
          {children}
        </div>
      )}
    </div>
  );
}
