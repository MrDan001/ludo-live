import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

// Premium/elite artwork is stored as Base64 text chunks. The first six shop
// avatars are a separate set and do not use this renderer.
const CHUNKS = Array.from(
  { length: 8 },
  (_, i) => `/avatars/atlas-chunks/${String(i).padStart(2, "0")}.txt?v=20260826-11`,
);
const COLS = 6;
const CELL_W = 160;
const CELL_H = 112;
const ATLAS_W = 960;
const ATLAS_H = 560;

function atlasIndex(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;
  const n = Number(match[2]);
  const index = id.startsWith("elite-") ? 10 + n : n;
  if (index < 1 || index > 30) return null;
  return index - 1;
}

function cleanBase64(value: string) {
  const cleaned = value.replace(/\s+/g, "");
  const firstPadding = cleaned.indexOf("=");
  return firstPadding >= 0 ? cleaned.slice(0, firstPadding + 2) : cleaned;
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const index = atlasIndex(id || "");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (index === null) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      const responses = await Promise.all(
        CHUNKS.map(async (url) => {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error(`Avatar chunk failed: ${response.status}`);
          return cleanBase64(await response.text());
        }),
      );

      // Decode every chunk independently. This is important because Base64
      // padding is allowed at a chunk boundary; joining padded strings first
      // produces invalid binary data.
      const decoded = responses.map(decodeBase64);
      const total = decoded.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(total);
      let offset = 0;
      for (const chunk of decoded) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      const blob = new Blob([combined], { type: "image/webp" });
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) setSrc(objectUrl);
    })().catch(() => {
      if (!cancelled) setSrc(null);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [index]);

  if (index === null || !src) return null;

  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const displaySize = size ?? "100%";

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox={`0 0 ${CELL_W} ${CELL_H}`}
      preserveAspectRatio="xMidYMid slice"
      width={displaySize}
      height={displaySize}
      style={{
        display: "block",
        width: displaySize,
        height: displaySize,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        background: "transparent",
        ...style,
      }}
    >
      <image
        href={src}
        x={-(col * CELL_W)}
        y={-(row * CELL_H)}
        width={ATLAS_W}
        height={ATLAS_H}
        preserveAspectRatio="none"
      />
    </svg>
  );
}
