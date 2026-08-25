import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

type Palette = { bg1: string; bg2: string; suit: string; trim: string; hair: string; skin: string };

const palettes: Palette[] = [
  { bg1: "#111827", bg2: "#312e81", suit: "#2563eb", trim: "#67e8f9", hair: "#111827", skin: "#8d5524" },
  { bg1: "#172554", bg2: "#581c87", suit: "#7c3aed", trim: "#f9a8d4", hair: "#3f2a1d", skin: "#a96b3c" },
  { bg1: "#052e16", bg2: "#166534", suit: "#16a34a", trim: "#fbbf24", hair: "#4c1d12", skin: "#c68642" },
  { bg1: "#082f49", bg2: "#0369a1", suit: "#0891b2", trim: "#a7f3d0", hair: "#e5e7eb", skin: "#e0ac69" },
  { bg1: "#4c0519", bg2: "#be123c", suit: "#e11d48", trim: "#fda4af", hair: "#111827", skin: "#6f3f22" },
  { bg1: "#1e1b4b", bg2: "#6d28d9", suit: "#7c3aed", trim: "#67e8f9", hair: "#4c1d95", skin: "#b87950" },
  { bg1: "#422006", bg2: "#a16207", suit: "#ca8a04", trim: "#fde68a", hair: "#3f2a1d", skin: "#8d5524" },
  { bg1: "#083344", bg2: "#0e7490", suit: "#0891b2", trim: "#a7f3d0", hair: "#111827", skin: "#a96b3c" },
  { bg1: "#500724", bg2: "#be185d", suit: "#db2777", trim: "#fbcfe8", hair: "#7c2d12", skin: "#c68642" },
  { bg1: "#431407", bg2: "#c2410c", suit: "#ea580c", trim: "#fed7aa", hair: "#111827", skin: "#e0ac69" },
];

function indexOfAvatar(id: string) {
  const m = id.match(/^(?:premium|elite)-(\d{2})$/);
  if (!m) return 1;
  const n = Number(m[1]);
  return id.startsWith("elite-") ? 10 + n : n;
}

const hairStyles = [
  `<path d="M31 52c0-27 14-42 34-42 22 0 34 16 33 43-8-9-17-14-29-14-15 0-25 5-38 13Z" fill="HAIR"/><path d="M35 34c8-15 18-21 31-21" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="5" stroke-linecap="round"/>`,
  `<path d="M29 50c4-28 18-40 36-40 17 0 31 12 34 40l-10-6-5-16-8 11-12-10-11 12-11-8-5 18Z" fill="HAIR"/>`,
  `<path d="M30 48c1-29 15-40 35-40 20 0 33 13 34 40-8-6-15-9-23-10l-8-16-8 17c-12 1-21 5-30 9Z" fill="HAIR"/><path d="M58 12c8-7 18-5 24 1" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="4" stroke-linecap="round"/>`,
  `<path d="M31 47c2-25 14-38 33-38 18 0 31 12 34 38l-9-3-6-17-9 12-10-15-11 14-10-9-5 18Z" fill="HAIR"/>`,
  `<path d="M28 52c2-31 17-45 37-45 21 0 35 15 36 45l-11-11c-8-6-17-8-27-8-12 0-22 5-35 19Z" fill="HAIR"/><circle cx="45" cy="17" r="6" fill="TRIM" opacity=".7"/>`,
  `<path d="M32 48c0-26 12-39 32-39 20 0 33 14 33 39l-7-7c-4-3-7-8-8-15-7 8-14 11-22 11-9 0-17-3-24-9-1 8-3 14-4 20Z" fill="HAIR"/>`,
];

const eyeStyles = [
  `<circle cx="51" cy="56" r="4" fill="#111827"/><circle cx="77" cy="56" r="4" fill="#111827"/>`,
  `<path d="M46 56h10M72 56h10" stroke="#111827" stroke-width="4" stroke-linecap="round"/>`,
  `<circle cx="51" cy="56" r="4" fill="#111827"/><circle cx="77" cy="56" r="4" fill="#111827"/><circle cx="52" cy="55" r="1.5" fill="#fff"/><circle cx="78" cy="55" r="1.5" fill="#fff"/>`,
];

const accessoryStyles = [
  `<path d="M39 51h50v15H39Z" fill="#111827" opacity=".94"/><circle cx="51" cy="58" r="3" fill="TRIM"/><circle cx="77" cy="58" r="3" fill="TRIM"/>`,
  `<circle cx="51" cy="56" r="8" fill="none" stroke="TRIM" stroke-width="3"/><circle cx="77" cy="56" r="8" fill="none" stroke="TRIM" stroke-width="3"/><path d="M59 56h10" stroke="TRIM" stroke-width="3"/>`,
  `<path d="M38 45c8-18 44-18 52 0" fill="none" stroke="TRIM" stroke-width="7" stroke-linecap="round"/><path d="M44 42h40" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`,
  `<path d="M41 31 50 16l7 11 8-15 8 15 9-11 5 28H36Z" fill="TRIM"/><path d="M49 28h30" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>`,
  `<path d="M27 51h18M83 51h18" stroke="TRIM" stroke-width="5" stroke-linecap="round"/><path d="M32 45c4-8 10-13 17-15M96 45c-4-8-10-13-17-15" stroke="TRIM" stroke-width="3" fill="none"/>`,
  `<path d="M43 69c8 8 34 8 42 0" fill="none" stroke="TRIM" stroke-width="5" stroke-linecap="round"/><circle cx="39" cy="70" r="3" fill="TRIM"/><circle cx="89" cy="70" r="3" fill="TRIM"/>`,
  `<path d="M34 38c7-10 17-15 30-15s23 5 30 15" fill="none" stroke="TRIM" stroke-width="5" stroke-linecap="round"/><circle cx="64" cy="22" r="5" fill="TRIM"/>`,
];

function replaceTokens(value: string, palette: Palette) {
  return value.replaceAll("HAIR", palette.hair).replaceAll("TRIM", palette.trim);
}

function svgForAvatar(id: string) {
  const n = Math.max(1, Math.min(30, indexOfAvatar(id)));
  const palette = palettes[(n - 1) % palettes.length];
  const elite = id.startsWith("elite-");
  const hair = replaceTokens(hairStyles[(n - 1) % hairStyles.length], palette);
  const eyes = eyeStyles[(n - 1) % eyeStyles.length];
  const accessory = replaceTokens(accessoryStyles[(n - 1) % accessoryStyles.length], palette);
  const faceRx = 31 + ((n * 3) % 5);
  const faceRy = 35 + ((n * 2) % 4);
  const suit = palette.suit;
  const trim = palette.trim;
  const bgId = `avatar-bg-${n}`;
  const shineId = `avatar-shine-${n}`;
  const eliteFrame = elite
    ? `<rect x="6" y="6" width="116" height="116" rx="27" fill="none" stroke="${trim}" stroke-width="3" opacity=".9"/><path d="M18 30V18h12M98 18h12v12M18 98v12h12M98 110h12V98" fill="none" stroke="${trim}" stroke-width="3" stroke-linecap="round"/><circle cx="64" cy="10" r="4" fill="${trim}"/><circle cx="118" cy="64" r="4" fill="${trim}"/><circle cx="10" cy="64" r="4" fill="${trim}"/>`
    : "";

  return `<svg viewBox="0 0 128 128" width="100%" height="100%" role="img" aria-label="${elite ? "Elite" : "Premium"} avatar" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${bgId}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette.bg1}"/><stop offset="1" stop-color="${palette.bg2}"/></linearGradient>
    <radialGradient id="${shineId}" cx="35%" cy="22%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".20"/><stop offset=".55" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>
    <filter id="shadow-${n}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".35"/></filter>
  </defs>
  <rect x="2" y="2" width="124" height="124" rx="29" fill="url(#${bgId})"/>
  <circle cx="64" cy="56" r="48" fill="#fff" opacity=".035"/>
  <g filter="url(#shadow-${n})">
    <path d="M27 122c3-25 16-39 37-39s34 14 37 39Z" fill="${palette.bg1}"/>
    <path d="M34 121c3-18 13-29 30-29s27 11 30 29Z" fill="${suit}"/>
    <path d="M49 94c8 6 22 6 30 0l-5 27H54Z" fill="${trim}" opacity=".92"/>
    <ellipse cx="64" cy="55" rx="${faceRx}" ry="${faceRy}" fill="${palette.skin}"/>
    <ellipse cx="55" cy="43" rx="17" ry="13" fill="#fff" opacity=".06"/>
    ${hair}
    ${eyes}
    <path d="M55 72c6 5 12 5 18 0" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>
    <path d="M49 65c4 2 8 2 11 0M68 65c3 2 7 2 11 0" fill="none" stroke="#6b3a20" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
    ${accessory}
  </g>
  <rect x="3" y="3" width="122" height="122" rx="28" fill="url(#${shineId})"/>
  ${eliteFrame}
  <rect x="3" y="3" width="122" height="122" rx="28" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2"/>
  </svg>`;
}

export default function AvatarArtwork({ id, className, style, size }: Props) {
  if (!/^(premium|elite)-\d{2}$/.test(id || "")) return null;
  const width = size ?? "100%";
  return <span className={className} style={{ display: "block", width, height: width, lineHeight: 0, ...style }} dangerouslySetInnerHTML={{ __html: svgForAvatar(id as string) }} />;
}
