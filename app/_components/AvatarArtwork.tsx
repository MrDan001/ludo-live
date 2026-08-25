import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// The premium/elite atlas is a 6 x 5 image. Keep the URL versioned so browsers
// and the deployed CDN don't keep an older cached atlas after an asset update.
const ATLAS = "/avatars/premium-elite-atlas.webp?v=20260825-6";

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

  // Use a real <img> so the browser has a normal image request and decoding
  // path. The 6 x 5 atlas is enlarged to six container widths by five heights;
  // left/top then move the requested cell into the visible viewport exactly.
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
        backgroundColor: "#061226",
        ...style,
      }}
    >
      <img
        src={ATLAS}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: `${-cell.col * 100}%`,
          top: `${-cell.row * 100}%`,
          width: "600%",
          height: "500%",
          maxWidth: "none",
          maxHeight: "none",
          objectFit: "fill",
          display: "block",
          userSelect: "none",
          pointerEvents: "none",
        }}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </span>
  );
}
