import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// The supplied artwork is a 6 x 5 sheet at 960 x 560 (160 x 112 per avatar).
// Use the existing WebP directly and an SVG viewport to display exactly ONE character.
// This avoids the broken Base64 chunk reconstruction and CSS background scaling/cropping.
const ATLAS_SRC = "/avatars/premium-elite-atlas.webp";
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
  if (index === null) return null;

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
        href={ATLAS_SRC}
        x={x}
        y={y}
        width={ATLAS_W}
        height={ATLAS_H}
        preserveAspectRatio="none"
      />
    </svg>
  );
}
