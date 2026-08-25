import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

const ATLAS = "/avatars/premium-elite-atlas.webp";

function atlasCell(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;
  const n = Number(match[2]);
  const index = id.startsWith("premium") ? n : 10 + n;
  if (index < 1 || index > 30) return null;
  const zero = index - 1;
  const col = zero % 6;
  const row = Math.floor(zero / 6);
  return { col, row };
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const cell = atlasCell(id || "");
  if (!cell) return null;

  const width = size ?? "100%";
  // Use the finished artwork directly. No runtime vectorization, AI upscale,
  // image generation, or build-time Vulkan/optimization step is involved.
  const backgroundSize = (style as any)?.backgroundSize ?? "auto 500%";
  const backgroundPosition =
    backgroundSize === "600% 500%"
      ? `${cell.col * 20}% ${cell.row * 25}%`
      : `${cell.col * 18.76}% ${cell.row * 25}%`;

  return (
    <span
      className={className}
      aria-label={`${id.startsWith("elite-") ? "Elite" : "Premium"} avatar`}
      style={{
        display: "block",
        width,
        height: width,
        lineHeight: 0,
        backgroundImage: `url(${ATLAS})`,
        backgroundRepeat: "no-repeat",
        backgroundSize,
        backgroundPosition,
        backgroundColor: "#061226",
        ...style,
      }}
    />
  );
}
