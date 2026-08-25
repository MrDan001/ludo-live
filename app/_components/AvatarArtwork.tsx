import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// User-supplied Premium + Elite artwork: 30 characters in a 6-column x 5-row image atlas.
const ATLAS = "/avatars/ludo-live-avatar-atlas.webp?v=20260826-3";

function atlasCell(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;

  const n = Number(match[2]);
  const index = id.startsWith("elite-") ? 10 + n : n;
  if (index < 1 || index > 30) return null;

  const zero = index - 1;
  return { col: zero % 6, row: Math.floor(zero / 6) };
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const cell = atlasCell(id || "");
  if (!cell) return null;

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width: size ?? "100%",
        height: size ?? "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        backgroundImage: `url(${ATLAS})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "600% 500%",
        backgroundPosition: `${cell.col * 20}% ${cell.row * 25}%`,
        ...style,
      }}
    />
  );
}
