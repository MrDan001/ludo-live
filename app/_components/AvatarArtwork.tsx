import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

const CHUNKS = Array.from({ length: 8 }, (_, i) => `/avatars/atlas-chunks/${String(i).padStart(2, "0")}.txt?v=20260826-5`);
const COLS = 6;
const ROWS = 5;
const CELL_W = 160;
const CELL_H = 112;
const OUTPUT = 768;

function atlasCell(id: string) {
  const match = id.match(/^(premium|elite)-(\d{2})$/);
  if (!match) return null;
  const n = Number(match[2]);
  const index = id.startsWith("elite-") ? 10 + n : n;
  if (index < 1 || index > 30) return null;
  const zero = index - 1;
  return { col: zero % COLS, row: Math.floor(zero / COLS) };
}

function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const image = ctx.getImageData(0, 0, w, h);
  const src = image.data;
  const out = new Uint8ClampedArray(src);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let value = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            value += src[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        out[p + c] = Math.max(0, Math.min(255, value));
      }
    }
  }
  image.data.set(out);
  ctx.putImageData(image, 0, 0);
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  const cell = atlasCell(id || "");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(CHUNKS.map((url) => fetch(url, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`Avatar asset failed: ${r.status}`);
      return r.text();
    })))
      .then((parts) => { if (!cancelled) setSrc(`data:image/webp;base64,${parts.join("")}`); })
      .catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cell || !src || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const sx = cell.col * CELL_W + (CELL_W - CELL_H) / 2;
      const sy = cell.row * CELL_H;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, CELL_H, CELL_H, 0, 0, OUTPUT, OUTPUT);
      sharpen(ctx, OUTPUT, OUTPUT);
    };
    img.src = src;
  }, [cell?.col, cell?.row, src]);

  if (!cell || !src) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width: size ?? "100%",
        height: size ?? "100%",
        minWidth: 0,
        minHeight: 0,
        objectFit: "cover",
        borderRadius: "inherit",
        ...style,
      }}
    />
  );
}
