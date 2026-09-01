import { NextResponse } from "next/server";

const THEMES: Record<string, [string, string, string, string, string]> = {
  classic: ["#ef4444", "#3b82f6", "#22c55e", "#facc15", "#f8fafc"],
  golden: ["#f59e0b", "#fde68a", "#b45309", "#fff7ed", "#fffdf5"],
  neon: ["#ec4899", "#22d3ee", "#a855f7", "#84cc16", "#101827"],
  beach: ["#38bdf8", "#fbbf24", "#fb7185", "#34d399", "#e0f2fe"],
  galaxy: ["#6366f1", "#a855f7", "#06b6d4", "#ec4899", "#111827"],
  wood: ["#b45309", "#92400e", "#d97706", "#f59e0b", "#fef3c7"],
  dragon: ["#dc2626", "#7c3aed", "#16a34a", "#f59e0b", "#111827"],
  christmas: ["#dc2626", "#16a34a", "#f8fafc", "#b91c1c", "#fef2f2"],
  football: ["#15803d", "#166534", "#f8fafc", "#84cc16", "#14532d"],
  candy: ["#f472b6", "#60a5fa", "#c084fc", "#facc15", "#fff1f2"],
  marble: ["#64748b", "#e2e8f0", "#94a3b8", "#f8fafc", "#1e293b"],
  nature: ["#166534", "#65a30d", "#92400e", "#84cc16", "#ecfccb"],
  space: ["#312e81", "#4338ca", "#0f766e", "#7e22ce", "#020617"],
  crystal: ["#38bdf8", "#67e8f9", "#a5f3fc", "#818cf8", "#eff6ff"],
  fireice: ["#ef4444", "#f97316", "#38bdf8", "#60a5fa", "#0f172a"],
  jungle: ["#166534", "#15803d", "#a16207", "#65a30d", "#052e16"],
  love: ["#fb7185", "#f43f5e", "#f9a8d4", "#c026d3", "#fff1f2"],
  night: ["#1e3a8a", "#312e81", "#0f766e", "#7c3aed", "#020617"],
  arabian: ["#92400e", "#d97706", "#ca8a04", "#facc15", "#1c1917"],
  "midnight-live": ["#111827", "#1d4ed8", "#7c3aed", "#0891b2", "#030712"],
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [red, blue, green, yellow, center] = THEMES[id] || THEMES.classic;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" rx="38" fill="${center}"/><rect x="18" y="18" width="564" height="564" rx="30" fill="#fff" stroke="#111827" stroke-width="10"/><rect x="30" y="30" width="210" height="210" rx="18" fill="${red}"/><rect x="360" y="30" width="210" height="210" rx="18" fill="${blue}"/><rect x="30" y="360" width="210" height="210" rx="18" fill="${green}"/><rect x="360" y="360" width="210" height="210" rx="18" fill="${yellow}"/><path d="M240 30h120v210h120v120H360v210H240V360H30V240h210z" fill="#f8fafc" stroke="#111827" stroke-width="5"/><circle cx="300" cy="300" r="62" fill="${center}" stroke="#111827" stroke-width="7"/><path d="M300 238L362 300 300 362 238 300z" fill="${yellow}" opacity=".9"/><circle cx="95" cy="95" r="24" fill="#fff" opacity=".85"/><circle cx="505" cy="95" r="24" fill="#fff" opacity=".85"/><circle cx="95" cy="505" r="24" fill="#fff" opacity=".85"/><circle cx="505" cy="505" r="24" fill="#fff" opacity=".85"/><text x="300" y="540" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#fff">${id.replace(/&/g, "&amp;")}</text></svg>`;
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
