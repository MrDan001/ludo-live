import type { CSSProperties } from "react";

type Props = {
  id?: string;
  className?: string;
  style?: CSSProperties;
  size?: number | string;
};

// Premium and elite avatars are intentionally stored as individual image files.
// The first six avatars use the existing emoji-based renderer and never enter here.
function imagePath(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;

  const number = match[1] === "premium"
    ? Number(match[2])
    : 10 + Number(match[2]);

  if (number < 1 || number > 30) return null;
  return `/avatars/premium-elite/avatar-${String(number).padStart(2, "0")}.webp`;
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const src = imagePath(id || "");
  if (!src) return null;

  const displaySize = size ?? "100%";

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={className}
      width={typeof displaySize === "number" ? displaySize : undefined}
      height={typeof displaySize === "number" ? displaySize : undefined}
      style={{
        display: "block",
        width: displaySize,
        height: displaySize,
        minWidth: 0,
        minHeight: 0,
        objectFit: "contain",
        objectPosition: "center",
        ...style,
      }}
    />
  );
}
