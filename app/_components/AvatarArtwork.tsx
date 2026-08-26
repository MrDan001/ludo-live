import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// Premium/elite artwork is a separate 6-column x 5-row atlas (30 distinct avatars).
// The first six shop avatars are separate from this premium/elite set.
const ATLAS_URL = "/avatars/premium-elite-atlas.webp?v=20260826-10";
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
  const displaySize = size ?? "100%";

  // Clip one cell from the dedicated premium/elite atlas. Do not rebuild the
  // image from Base64 chunks: the repository already contains the complete
  // WebP atlas and the direct asset is much more reliable in the browser.
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
        background: "transparent",
        ...style,
      }}
    >
      <image
        href={ATLAS_URL}
        x={-(col * CELL_W)}
        y={-(row * CELL_H)}
        width={ATLAS_W}
        height={ATLAS_H}
        preserveAspectRatio="none"
      />
    </svg>
  );
}
