import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

const CHUNKS = Array.from({ length: 8 }, (_, i) => `/avatars/atlas-chunks/${String(i).padStart(2, "0")}.txt?v=20260826-4`);

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
  const cell = atlasCell(id || "");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(CHUNKS.map((url) => fetch(url, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`Avatar asset failed: ${r.status}`);
      return r.text();
    })))
      .then((parts) => {
        if (!cancelled) setSrc(`data:image/webp;base64,${parts.join("")}`);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => { cancelled = true; };
  }, []);

  if (!cell || !src) return null;

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width: size ?? "100%",
        height: size ?? "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "600% 500%",
        backgroundPosition: `${cell.col * 20}% ${cell.row * 25}%`,
        backgroundColor: "transparent",
        ...style,
      }}
    />
  );
}
