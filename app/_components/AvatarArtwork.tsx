import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// The supplied premium/elite artwork is a 6-column x 5-row sheet at 960 x 560.
// The artwork is stored in 8 Base64 text chunks. Trim each chunk before joining:
// seven files contain a trailing newline (6265 bytes = 6264 Base64 chars + LF),
// while 06.txt is 6264 bytes. The LF is not part of the Base64 payload.
const CHUNKS = Array.from(
  { length: 8 },
  (_, i) => `/avatars/atlas-chunks/${String(i).padStart(2, "0")}.txt?v=20260826-8`,
);
const COLS = 6;
const CELL_W = 160;
const CELL_H = 112;
const ATLAS_W = 960;
const ATLAS_H = 560;

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

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      CHUNKS.map(async (url) => {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Avatar asset failed: ${response.status}`);
        return (await response.text()).trim();
      }),
    )
      .then((parts) => {
        const base64 = parts.join("");
        if (base64.length % 4 !== 0) {
          throw new Error(`Invalid avatar Base64 length: ${base64.length}`);
        }
        if (!cancelled) setSrc(`data:image/webp;base64,${base64}`);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (index === null || !src) return null;

  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = -(col * CELL_W);
  const y = -(row * CELL_H);
  const displaySize = size ?? "100%";

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox={`0 0 ${CELL_W} ${CELL_H}`}
      preserveAspectRatio="xMidYMid slice"
      width={displaySize}
      height={displaySize}
      style={{
        display: "block",
        width: displaySize,
        height: displaySize,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        background: "#000",
        ...style,
      }}
    >
      <image
        href={src}
        x={x}
        y={y}
        width={ATLAS_W}
        height={ATLAS_H}
        preserveAspectRatio="none"
      />
    </svg>
  );
}
