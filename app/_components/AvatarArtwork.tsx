import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// Approved 30-character artwork atlas: 6 columns x 5 rows, square cells.
const ATLAS = "/avatars/premium-elite-atlas.webp?v=20260825-5";

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
  const avatarId = id || "";
  const cell = atlasCell(avatarId);
  if (!cell) return null;

  const width = size ?? "100%";
  const backgroundSize = "auto 500%";
  const backgroundPosition = `${cell.col * 20}% ${cell.row * 25}%`;

  return (
    <span
      className={className}
      aria-label={`${avatarId.startsWith("elite-") ? "Elite" : "Premium"} avatar`}
      style={{
        display: "block",
        width,
        height: width,
        minWidth: 0,
        minHeight: 0,
        lineHeight: 0,
        backgroundColor: "#061226",
        backgroundImage: `url(${ATLAS})`,
        backgroundRepeat: "no-repeat",
        backgroundSize,
        backgroundPosition,
        ...style,
      }}
    />
  );
}
