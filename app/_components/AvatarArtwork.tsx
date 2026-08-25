import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

const CHUNKS = Array.from({ length: 8 }, (_, i) => `/avatars/atlas-chunks/${String(i).padStart(2, "0")}.txt?v=20260826-6`);
const COLS = 6;
const ROWS = 5;

function atlasIndex(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;
  const n = Number(match[2]);
  const index = id.startsWith("elite-") ? 10 + n : n;
  if (index < 1 || index > 30) return null;
  return index - 1;
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const index = atlasIndex(id || "");
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      CHUNKS.map((url) =>
        fetch(url, { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error(`Avatar asset failed: ${r.status}`);
          return r.text();
        }),
      ),
    )
      .then((parts) => {
        if (!cancelled) setSrc(`data:image/webp;base64,${parts.join("")}`);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = src;
    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [src]);

  if (index === null || !src || !natural) return null;

  // Use the decoded atlas dimensions instead of hard-coded pixels. This prevents
  // a lower-resolution or differently-sized atlas from cropping multiple avatars.
  const cellW = natural.width / COLS;
  const cellH = natural.height / ROWS;
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = -(col * cellW);
  const y = -(row * cellH);
  const displaySize = size ?? "100%";

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "relative",
        display: "block",
        width: displaySize,
        height: displaySize,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        backgroundColor: "#000",
        ...style,
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: natural.width,
          height: natural.height,
          maxWidth: "none",
          maxHeight: "none",
          display: "block",
          userSelect: "none",
        }}
      />
    </div>
  );
}
