import sharp from "sharp";

/**
 * Convert avatar artwork to a transparent, square-ready asset without
 * destroying subject details. Only pixels that are both connected to the
 * border and very close to the estimated border background are removed.
 * If the image does not look like it has a removable background, the original
 * alpha is preserved and the artwork is only normalized.
 */
export async function stripAvatarBackground(input: Buffer): Promise<Buffer> {
  const source = sharp(input, { failOn: "error" }).ensureAlpha();
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  if (!width || !height || channels < 4) throw new Error("Unable to read avatar dimensions.");

  // If the source already has meaningful transparency, do not reinterpret it.
  let transparent = 0;
  for (let p = 0; p < width * height; p++) {
    if (data[p * channels + 3] < 250) transparent++;
  }
  const hasTransparency = transparent > width * height * 0.005;

  if (!hasTransparency) {
    const samples: number[][] = [];
    const step = Math.max(1, Math.floor(Math.min(width, height) / 96));
    for (let y = 0; y < height; y += step) {
      for (const x of [0, width - 1]) {
        const i = (y * width + x) * channels;
        samples.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
    for (let x = 0; x < width; x += step) {
      for (const y of [0, height - 1]) {
        const i = (y * width + x) * channels;
        samples.push([data[i], data[i + 1], data[i + 2]]);
      }
    }

    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)] ?? 0;
    };
    const bg = [
      median(samples.map(s => s[0])),
      median(samples.map(s => s[1])),
      median(samples.map(s => s[2])),
    ];

    const distance = (i: number) => Math.sqrt(
      (data[i] - bg[0]) ** 2 +
      (data[i + 1] - bg[1]) ** 2 +
      (data[i + 2] - bg[2]) ** 2,
    );

    // Conservative flood fill. A pixel must be very close to the border
    // background to enter the removable region. Internal matching colors are
    // never removed unless they are physically connected to that region.
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;
    const threshold = 24;
    const seed = (x: number, y: number) => {
      const p = y * width + x;
      if (visited[p]) return;
      const i = p * channels;
      if (distance(i) <= threshold) {
        visited[p] = 1;
        queue[tail++] = p;
      }
    };

    for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
    for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }

    while (head < tail) {
      const p = queue[head++];
      const x = p % width;
      const y = Math.floor(p / width);
      if (x > 0) seed(x - 1, y);
      if (x + 1 < width) seed(x + 1, y);
      if (y > 0) seed(x, y - 1);
      if (y + 1 < height) seed(x, y + 1);
    }

    for (let p = 0; p < width * height; p++) {
      if (visited[p]) data[p * channels + 3] = 0;
    }
  }

  const cleaned = sharp(data, { raw: { width, height, channels: 4 } });
  const trimmed = await cleaned
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .png()
    .toBuffer();

  const trimmedMeta = await sharp(trimmed).metadata();
  if (!trimmedMeta.width || !trimmedMeta.height) throw new Error("Unable to normalize avatar artwork.");

  const maxSide = Math.max(trimmedMeta.width, trimmedMeta.height);
  const padding = Math.max(10, Math.round(maxSide * 0.10));
  const canvas = maxSide + padding * 2;

  return sharp(trimmed)
    .resize({ width: maxSide, height: maxSide, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width: canvas, height: canvas, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}
