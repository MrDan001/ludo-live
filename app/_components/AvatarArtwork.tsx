import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// Original 30-avatar vector atlas: 5 columns x 6 rows.
// We use the vector source directly because the committed WebP atlas is not a valid WebP file.
const ATLAS = "/avatars/premium-elite-atlas.svg?v=20260826-1";

function atlasCell(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;

  const n = Number(match[2]);
  const index = id.startsWith("elite-") ? 10 + n : n;
  if (index < 1 || index > 30) return null;

  const zero = index - 1;
  return {
    col: zero % 5,
    row: Math.floor(zero / 5),
  };
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const cell = atlasCell(id || "");
  if (!cell) return null;

  const width = size ?? "100%";
  const backgroundPosition = `${cell.col * 25}% ${cell.row * 20}%`;

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width,
        height: size ?? "100%",
        minWidth: 0,
        minHeight: 0,
        lineHeight: 0,
        overflow: "hidden",
        position: "relative",
        backgroundColor: "transparent",
        backgroundImage: `url(${ATLAS})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "500% 600%",
        backgroundPosition,
        backgroundClip: "padding-box",
        ...style,
      }}
    />
  );
}
