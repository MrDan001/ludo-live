import type { CSSProperties } from "react";

type Props = {
  id?: string;
  className?: string;
  style?: CSSProperties;
  size?: number | string;
};

// The 30 new avatars are a single, clean sprite made directly from the 30
// supplied WebP files. There is no Base64, chunk fetching, Blob construction,
// SVG atlas, or runtime image decoding.
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
  const backgroundWidth = `${COLS * 100}%`;
  const backgroundHeight = `${ROWS * 100}%`;
  const backgroundX = COLS === 1 ? 0 : (col / (COLS - 1)) * 100;
  const backgroundY = ROWS === 1 ? 0 : (row / (ROWS - 1)) * 100;

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
        backgroundSize: `${backgroundWidth} ${backgroundHeight}`,
        backgroundPosition: `${backgroundX}% ${backgroundY}%`,
        ...style,
      }}
    />
  );
}
