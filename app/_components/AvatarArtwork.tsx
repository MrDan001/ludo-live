import type { CSSProperties } from "react";

type Props = { id?: string; className?: string; style?: CSSProperties; size?: number | string };

const palettes = [
  ["#ff8a3d", "#172554", "#facc15"], ["#4f46e5", "#581c87", "#f9a8d4"],
  ["#16a34a", "#052e16", "#fbbf24"], ["#0ea5e9", "#082f49", "#e2e8f0"],
  ["#e11d48", "#4c0519", "#fda4af"], ["#7c3aed", "#1e1b4b", "#67e8f9"],
  ["#ca8a04", "#422006", "#fde68a"], ["#0891b2", "#083344", "#a7f3d0"],
  ["#db2777", "#500724", "#fbcfe8"], ["#ea580c", "#431407", "#fed7aa"],
];
const skin = ["#8d5524", "#a96b3c", "#c68642", "#e0ac69", "#6f3f22"][0];
const skinTones = ["#8d5524", "#a96b3c", "#c68642", "#e0ac69", "#6f3f22", "#b87950"];

function indexOfAvatar(id: string) {
  const m = id.match(/^(?:premium|elite)-(\d{2})$/);
  if (!m) return 0;
  const n = Number(m[1]);
  return id.startsWith("elite-") ? 10 + n : n;
}

function VectorAvatar({ id, className, style, size }: Props) {
  const n = Math.max(1, Math.min(30, indexOfAvatar(id || "premium-01")));
  const p = palettes[(n - 1) % palettes.length];
  const tone = skinTones[(n - 1) % skinTones.length];
  const hair = ["#111827", "#3f2a1d", "#7c2d12", "#4c1d95", "#f59e0b", "#e5e7eb"][(n - 1) % 6];
  const accent = p[2];
  const grad = `avatar-bg-${n}`;
  const face = `avatar-face-${n}`;
  const accessory = (n - 1) % 10;
  const isElite = id?.startsWith("elite-");
  const width = size ?? "100%";

  return (
    <svg className={className} style={style} width={width} height={width} viewBox="0 0 128 128" role="img" aria-label="Premium avatar" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p[0]} /><stop offset="1" stopColor={p[1]} /></linearGradient>
        <radialGradient id={face} cx="45%" cy="35%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity=".18" /><stop offset="1" stopColor="#000" stopOpacity=".12" /></radialGradient>
      </defs>
      <rect x="3" y="3" width="122" height="122" rx="28" fill={`url(#${grad})`} />
      <circle cx="64" cy="54" r="35" fill={tone} />
      <circle cx="64" cy="54" r="35" fill={`url(#${face})`} />
      <path d="M34 51c2-25 16-38 32-38 20 0 30 15 31 37-11-7-20-11-31-11-13 0-21 6-32 12Z" fill={hair} />
      <path d="M28 120c3-25 16-37 36-37s33 12 36 37Z" fill={p[1]} />
      <path d="M42 91c8 7 36 7 44 0l-6 29H48Z" fill={p[0]} opacity=".95" />
      <circle cx="51" cy="56" r="4" fill="#111827" /><circle cx="77" cy="56" r="4" fill="#111827" />
      <path d="M53 72c7 5 15 5 22 0" fill="none" stroke="#7c2d12" strokeWidth="3" strokeLinecap="round" />
      {accessory === 0 && <path d="M33 43h62" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity=".9" />}
      {accessory === 1 && <><circle cx="51" cy="56" r="7" fill="none" stroke={accent} strokeWidth="3" /><circle cx="77" cy="56" r="7" fill="none" stroke={accent} strokeWidth="3" /><path d="M58 56h12" stroke={accent} strokeWidth="3" /></>}
      {accessory === 2 && <path d="M39 40c7-17 43-17 50 0" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />}
      {accessory === 3 && <path d="M30 49 23 41l9-7 7 10M98 49l7-8-9-7-7 10" fill={accent} />}
      {accessory === 4 && <path d="M35 43c8-21 50-21 58 0l-5 3H40Z" fill="#111827" /><path d="M41 40h46" stroke={accent} strokeWidth="4" />}
      {accessory === 5 && <path d="M39 51h50v17H39Z" fill="#111827" opacity=".92" /><circle cx="51" cy="59" r="3" fill={accent} /><circle cx="77" cy="59" r="3" fill={accent} />}
      {accessory === 6 && <path d="M42 30 50 17l7 10 8-14 8 14 10-10 4 23H38Z" fill={accent} />}
      {accessory === 7 && <path d="M42 30c7-15 37-15 44 0" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" /><circle cx="64" cy="18" r="5" fill={accent} />}
      {accessory === 8 && <path d="M39 68c7 8 43 8 50 0v9c-12 9-38 9-50 0Z" fill={accent} />}
      {accessory === 9 && <><path d="M28 55h15M85 55h15" stroke={accent} strokeWidth="5" strokeLinecap="round" /><path d="M31 48c4-9 11-14 18-15M97 48c-4-9-11-14-18-15" stroke={accent} strokeWidth="3" fill="none" /></>}
      {isElite && <><circle cx="64" cy="8" r="5" fill={accent} /><circle cx="114" cy="64" r="4" fill={accent} /><circle cx="14" cy="64" r="4" fill={accent} /><rect x="6" y="6" width="116" height="116" rx="26" fill="none" stroke={accent} strokeWidth="2" opacity=".7" /></>}
      <rect x="3" y="3" width="122" height="122" rx="28" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2" />
    </svg>
  );
}

export default function AvatarArtwork(props: Props) {
  const id = props.id || "premium-01";
  if (!/^(premium|elite)-\d{2}$/.test(id)) return null;
  return <VectorAvatar {...props} id={id} />;
}
