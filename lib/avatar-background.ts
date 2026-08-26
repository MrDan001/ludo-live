import sharp from "sharp";

/**
 * Automatically makes the connected image background transparent.
 *
 * This is intentionally local and dependency-light: it estimates the background
 * from the image border and flood-fills only pixels that are visually similar to
 * that border. It preserves the original canvas and softens the cut edge instead
 * of simply deleting every pixel of one exact RGB value.
 *
 * For artwork with a highly textured/photographic background, a model-based
 * segmentation service is required for true subject matting; this function is
 * the safe built-in fallback and never sends the uploaded artwork off-server.
 */
export async function stripAvatarBackground(input: Buffer): Promise<Buffer> {
  const image = sharp(input, { failOn: "error" }).ensureAlpha();
  const meta = await image.metadata();
  if (!meta.width || !meta.height) throw new Error("Unable to read avatar dimensions.");

  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  if (channels < 4) throw new Error("Avatar image must have an alpha channel after decoding.");

  // Estimate the background from the four corners and a sparse border sample.
  const samples: number[][] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64));
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

  const bg = [0, 0, 0];
  for (const s of samples) {
    bg[0] += s[0]; bg[1] += s[1]; bg[2] += s[2];
  }
  bg[0] /= samples.length; bg[1] /= samples.length; bg[2] /= samples.length;

  const distance = (i: number) => Math.sqrt(
    (data[i] - bg[0]) ** 2 +
    (data[i + 1] - bg[1]) ** 2 +
    (data[i + 2] - bg[2]) ** 2,
  );

  // Pixels are considered background only when connected to the border.
  // This avoids punching holes through foreground areas that happen to share
  // a similar colour with the background.
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const seed = (x: number, y: number) => {
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * channels;
    // Transparent input is already background.
    if (data[i + 3] === 0 || distance(i) <= 58) {
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

  // Convert the connected background to transparency with a soft transition.
  // Pixels farther than the threshold remain untouched.
  const hard = 42;
  const soft = 24;
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

  return sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}
