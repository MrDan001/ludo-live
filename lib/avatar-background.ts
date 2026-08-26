import sharp from "sharp";

/**
 * Converts ordinary avatar artwork into a transparent, square-ready asset.
 *
 * This is intentionally local to the Railway server. It removes only background
 * pixels connected to the image border, then trims transparent margins and pads
 * the subject back onto a square transparent canvas. That last step is important:
 * source images often contain large empty margins, which otherwise makes an avatar
 * look tiny inside the circular UI.
 */
export async function stripAvatarBackground(input: Buffer): Promise<Buffer> {
  const source = sharp(input, { failOn: "error" }).ensureAlpha();
  const meta = await source.metadata();
  if (!meta.width || !meta.height) throw new Error("Unable to read avatar dimensions.");

  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  if (channels < 4) throw new Error("Avatar image must have an alpha channel after decoding.");

  // Use a robust median-ish border estimate instead of a simple average. This
  // prevents one colourful corner from pulling the estimated background too far.
  const samples: number[][] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 96));
  for (let y = 0; y < height; y += step) {
    for (const x of [0, width - 1]) {
      const i = (y * width + x) * channels;
      if (data[i + 3] > 8) samples.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  for (let x = 0; x < width; x += step) {
    for (const y of [0, height - 1]) {
      const i = (y * width + x) * channels;
      if (data[i + 3] > 8) samples.push([data[i], data[i + 1], data[i + 2]]);
    }
  }

  const median = (values: number[]) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
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

  // Flood-fill only background that is connected to the border. This protects
  // similarly-coloured areas inside the character from being punched out.
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const seed = (x: number, y: number) => {
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * channels;
    if (data[i + 3] === 0 || distance(i) <= 64) {
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

  const hard = 48;
  const soft = 28;
  for (let p = 0; p < width * height; p++) {
    if (!visited[p]) continue;
    const i = p * channels;
    const d = distance(i);
    if (d <= hard) data[i + 3] = 0;
    else if (d < hard + soft) {
      const keep = Math.round(((d - hard) / soft) * data[i + 3]);
      data[i + 3] = Math.max(0, Math.min(255, keep));
    } else {
      data[i + 3] = 0;
    }
  }

  // Trim transparent margins so the subject fills the avatar viewport. Add a
  // small transparent safety margin, then force a square transparent canvas.
  const cleaned = sharp(data, { raw: { width, height, channels: 4 } });
  const trimmed = await cleaned.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 }).png().toBuffer();
  const trimmedMeta = await sharp(trimmed).metadata();
  if (!trimmedMeta.width || !trimmedMeta.height) throw new Error("Unable to normalize avatar artwork.");

  const maxSide = Math.max(trimmedMeta.width, trimmedMeta.height);
  const padding = Math.max(8, Math.round(maxSide * 0.08));
  const canvas = maxSide + padding * 2;

  return sharp(trimmed)
    .resize({ width: maxSide, height: maxSide, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize({ width: canvas, height: canvas, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}
