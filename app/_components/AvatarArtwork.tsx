import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// The premium/elite artwork is a 5-column x 6-row atlas (30 avatars).
// The shop catalogue maps atlas:01..atlas:30 to premium-01..elite-20.
const ATLAS_SRC = "/avatars/premium-elite-atlas.webp";
const COLS = 5;
const ROWS = 6;

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

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width: displaySize,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        backgroundImage: `url(${ATLAS_SRC})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
        backgroundPosition: `${col * 25}% ${row * 20}%`,
        backgroundColor: "#000",
        ...style,
        // The Shop passes height:100%, but .simple-icon has no fixed height.
        // Keep an intrinsic square so the avatar cannot collapse to zero height.
        height: size ?? "auto",
        aspectRatio: "1 / 1",
      }}
    />
  );
}
