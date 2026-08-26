import type { CSSProperties } from "react";

type Props = {
  id?: string;
  className?: string;
  style?: CSSProperties;
  size?: number | string;
};

// The 30 supplied premium/elite avatars are rendered from one clean sprite.
// No Base64 chunks, runtime decoding, Blob creation, or SVG atlas is used.
const SHEET = "/avatars/premium-elite.webp";
const COLS = 5;
const ROWS = 6;

function sheetIndex(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;

  const number = match[1] === "premium"
    ? Number(match[2])
    : 10 + Number(match[2]);

  if (number < 1 || number > 30) return null;
  return number - 1;
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const index = sheetIndex(id || "");
  if (index === null) return null;

  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const displaySize = size ?? "100%";

  return (
    <div
      role="img"
      aria-label=""
      className={className}
      style={{
        display: "block",
        width: displaySize,
        height: displaySize,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        backgroundImage: `url(${SHEET})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "500% 600%",
        backgroundPosition: `${col * 25}% ${row * 20}%`,
        ...style,
      }}
    />
  );
}
