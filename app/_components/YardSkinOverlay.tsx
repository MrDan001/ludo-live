"use client";

import { useEffect, useMemo, useState } from "react";

const SKINS: Record<string, { background: string; border: string; pattern: string }> = {
  "yard-inferno": { background: "radial-gradient(circle at 50% 45%, #ffb300 0%, #ef6c00 42%, #8e1b12 100%)", border: "rgba(255,220,120,.9)", pattern: "🔥" },
  "yard-galaxy": { background: "radial-gradient(circle at 30% 25%, #7c4dff 0%, #263b91 42%, #070b24 100%)", border: "rgba(190,180,255,.95)", pattern: "✦" },
  "yard-royal": { background: "radial-gradient(circle at 50% 35%, #fff1a8 0%, #d5a928 42%, #6f4a08 100%)", border: "rgba(255,244,177,.95)", pattern: "♛" },
  "yard-ocean": { background: "radial-gradient(circle at 40% 30%, #9eeaff 0%, #1687c8 45%, #06466f 100%)", border: "rgba(190,245,255,.95)", pattern: "≈" },
  "yard-sakura": { background: "radial-gradient(circle at 50% 30%, #ffd6e8 0%, #e989b5 48%, #7e315d 100%)", border: "rgba(255,230,241,.95)", pattern: "✿" },
  "yard-shadow": { background: "radial-gradient(circle at 45% 35%, #5a5a67 0%, #24242f 48%, #08080d 100%)", border: "rgba(180,180,200,.8)", pattern: "◆" },
  "yard-neon": { background: "radial-gradient(circle at 50% 50%, #2bffdf 0%, #1a6bff 38%, #43106e 100%)", border: "rgba(190,255,245,.95)", pattern: "⚡" },
};

function skinFor(id: string | null) {
  return (id && SKINS[id]) || null;
}

export default function YardSkinOverlay() {
  const [yardId, setYardId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/customization", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const equipped = Array.isArray(data?.equippedItems) ? data.equippedItems.map(String) : [];
        const next = equipped.find((id: string) => id.startsWith("yard-")) || "yard-classic";
        if (alive) setYardId(next);
      } catch {}
    };
    load();
    const onRefresh = () => load();
    window.addEventListener("shop-inventory-updated", onRefresh);
    window.addEventListener("ludo-customization-updated", onRefresh);
    return () => { alive = false; window.removeEventListener("shop-inventory-updated", onRefresh); window.removeEventListener("ludo-customization-updated", onRefresh); };
  }, []);

  const skin = useMemo(() => skinFor(yardId), [yardId]);
  if (!skin) return null;

  // The board has a colored outer yard and a smaller white inner yard.
  // Skin only the white inner yard so the board's colored frame remains visible.
  // The four inner yards occupy roughly 28.5% of the 15x15 board, inset about 5.75%.
  const yards = [
    { left: "5.75%", top: "5.75%" },
    { left: "65.75%", top: "5.75%" },
    { left: "5.75%", top: "65.75%" },
    { left: "65.75%", top: "65.75%" },
  ];

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, overflow: "hidden" }}>
      {yards.map((yard, index) => (
        <div key={index} style={{ position: "absolute", left: yard.left, top: yard.top, width: "28.5%", height: "28.5%", boxSizing: "border-box", borderRadius: "5.5%", background: skin.background, border: `2px solid ${skin.border}`, boxShadow: "inset 0 0 18px rgba(0,0,0,.25), 0 2px 8px rgba(0,0,0,.16)" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "4.5%", border: `1px solid ${skin.border}`, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "4%", boxSizing: "border-box", color: "rgba(255,255,255,.82)", fontSize: "clamp(10px,2.2vw,22px)", fontWeight: 900, textShadow: "0 1px 4px rgba(0,0,0,.65)" }}>
            {skin.pattern}
          </div>
        </div>
      ))}
    </div>
  );
}
