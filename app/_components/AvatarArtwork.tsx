import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// The first six elite shop avatars use dedicated vector artwork so they are
// independent of the larger atlas and can be changed safely one-by-one.
const FEATURED_ELITE: Record<string, string> = {
  "elite-01": "/avatars/elite-01.svg?v=20260826-1", // Frost Mage
  "elite-02": "/avatars/elite-02.svg?v=20260826-1", // Flame Mage
  "elite-03": "/avatars/elite-03.svg?v=20260826-1", // Royal King
  "elite-04": "/avatars/elite-04.svg?v=20260826-1", // Royal Queen
  "elite-05": "/avatars/elite-05.svg?v=20260826-1", // Forest Ranger
  "elite-06": "/avatars/elite-06.svg?v=20260826-1", // Shadow Huntress
};

// Original 30-avatar vector atlas: 5 columns x 6 rows.
const ATLAS = "/avatars/premium-elite-atlas.svg?v=20260826-2";

function atlasCell(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;

  const n = Number(match[2]);
  const index = id.startsWith("elite-") ? 10 + n : n;
  if (index < 1 || index > 30) return null;

  const zero = index - 1;
  return { col: zero % 5, row: Math.floor(zero / 5) };
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const featuredSrc = id ? FEATURED_ELITE[id] : undefined;
  const width = size ?? "100%";
  const height = size ?? "100%";

  if (featuredSrc) {
    return (
      <img
        src={featuredSrc}
        alt=""
        aria-hidden="true"
        className={className}
        draggable={false}
        style={{
          display: "block",
          width,
          height,
          minWidth: 0,
          minHeight: 0,
          objectFit: "cover",
          objectPosition: "center",
          ...style,
        }}
      />
    );
  }

  const cell = atlasCell(id || "");
  if (!cell) return null;

  const backgroundPosition = `${cell.col * 25}% ${cell.row * 20}%`;

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width,
        height,
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
