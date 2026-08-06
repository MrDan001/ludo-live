"use client";

import { useMemo } from "react";

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function FacePips({ face }: { face: number }) {
  const pipSet = new Set((PIP_LAYOUTS[face] || []).map(([r, c]) => `${r},${c}`));
  return (
    <>
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        return (
          <div key={i} className="flex items-center justify-center">
            {pipSet.has(`${r},${c}`) && <div className="w-[55%] h-[55%] rounded-full bg-slate-900" />}
          </div>
        );
      })}
    </>
  );
}

// Which face (1-6) sits on each of the cube's 6 physical sides, and the
// placement transform that puts it there. Opposite faces sum to 7,
// matching a real die: front/back 1/6, right/left 2/5, top/bottom 3/4.
const CUBE_FACES: { face: number; place: (half: number) => string }[] = [
  { face: 1, place: (h) => `translateZ(${h}px)` },
  { face: 6, place: (h) => `rotateY(180deg) translateZ(${h}px)` },
  { face: 2, place: (h) => `rotateY(90deg) translateZ(${h}px)` },
  { face: 5, place: (h) => `rotateY(-90deg) translateZ(${h}px)` },
  { face: 3, place: (h) => `rotateX(90deg) translateZ(${h}px)` },
  { face: 4, place: (h) => `rotateX(-90deg) translateZ(${h}px)` },
];

// The cube rotation that brings a given face flat toward the viewer - the
// inverse of that face's own placement rotation above.
const FACE_TO_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  2: { x: 0, y: -90 },
  5: { x: 0, y: 90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
};

export interface Die3DProps {
  /** Which face (1-6) rests toward the viewer once settled. */
  face: number;
  /** Continuously tumbles in place instead of resting on `face` - use
   *  while the result isn't decided yet (still "in the air"). */
  spinning?: boolean;
  /** Pixel size of the cube (always square). */
  size?: number;
  className?: string;
}

export default function Die3D({ face, spinning, size = 56, className }: Die3DProps) {
  const half = size / 2;
  const rotation = FACE_TO_ROTATION[face] ?? FACE_TO_ROTATION[1];

  // Faces only need rebuilding when the cube's physical size changes -
  // their placement, not their rotation target, depends on `half`.
  const faces = useMemo(
    () =>
      CUBE_FACES.map(({ face: f, place }) => (
        <div
          key={f}
          className="absolute inset-0 bg-white border-2 border-slate-800 rounded-[14%] grid grid-cols-3 grid-rows-3 gap-0.5 p-[14%] shadow-inner"
          style={{ transform: place(half), backfaceVisibility: "hidden" }}
        >
          <FacePips face={f} />
        </div>
      )),
    [half]
  );

  return (
    <div className={["relative", className].filter(Boolean).join(" ")} style={{ width: size, height: size, perspective: size * 10 }}>
      <div
        className={spinning ? "die3d-spin" : ""}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: spinning ? undefined : "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: spinning ? undefined : `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
      >
        {faces}
      </div>
    </div>
  );
}