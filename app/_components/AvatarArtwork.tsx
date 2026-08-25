import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// The approved artwork is a 6-column x 5-row atlas (30 characters).
// Keep a version query here so browsers/service workers do not keep an older
// broken atlas response after an artwork replacement.
const ATLAS = "/avatars/premium-elite-atlas.webp?v=20260825-2";

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

  // The atlas is exactly 6 x 5. Explicitly sizing it to 600% x 500%
  // guarantees one complete character cell fills the preview regardless of
  // the source image's intrinsic aspect-ratio metadata.
  const backgroundSize = "600% 500%";
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
        ...style,
        // Keep the approved atlas geometry authoritative even if a caller
        // supplies conflicting background styling in its style prop.
        backgroundImage: `url(${ATLAS})`,
        backgroundRepeat: "no-repeat",
        backgroundSize,
        backgroundPosition,
      }}
    />
  );
}
