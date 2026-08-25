import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// Approved 30-character artwork supplied for Ludo Live.
// The source is a 6-column x 5-row atlas. It is served as SVG so the
// repository does not depend on the previously malformed WebP binary.
const ATLAS = "/avatars/premium-elite-atlas.svg?v=20260825-3";

function atlasCell(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;
  const n = Number(match[2]);
  const index = id.startsWith("elite-") ? 10 + n : n;
  if (index < 1 || index > 30) return null;

  const zero = index - 1;
  return {
    col: zero % 6,
    row: Math.floor(zero / 6),
  };
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const avatarId = id || "";
  const cell = atlasCell(avatarId);
  if (!cell) return null;

  const width = size ?? "100%";

  // Preserve the atlas aspect ratio. Each source cell is wider than the
  // square shop preview, so auto 500% keeps the artwork from being distorted.
  const backgroundSize = "auto 500%";
  const backgroundPosition = `${cell.col * 18.76}% ${cell.row * 25}%`;

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
        ...style,
        backgroundImage: `url(${ATLAS})`,
        backgroundRepeat: "no-repeat",
        backgroundSize,
        backgroundPosition,
      }}
    />
  );
}
