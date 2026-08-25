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

  // Render the atlas as a real image layer instead of relying on CSS
  // background-image cropping. This gives the browser an actual <img> load
  // target and lets us detect/contain the asset consistently in the shop.
  const backgroundPosition = `${cell.col * 20}% ${cell.row * 25}%`;

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
          inset: 0,
          width: "600%",
          height: "500%",
          maxWidth: "none",
          objectFit: "fill",
          objectPosition: "0 0",
          transform: `translate(${-cell.col * (100 / 6)}%, ${-cell.row * 20}%)`,
          transformOrigin: "top left",
          userSelect: "none",
          pointerEvents: "none",
        }}
        onError={(event) => {
          // Keep the shop card intact if the asset cannot be loaded.
          event.currentTarget.style.display = "none";
        }}
      />
    </span>
  );
}
