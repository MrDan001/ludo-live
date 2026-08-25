"use client";

import { useEffect, useState } from "react";

export const AVATAR_ICONS: Record<string, string> = {
  default: "🧑🏽‍🎮",
  "avatar-1": "🧑🏽‍🎮",
  "avatar-2": "👩🏽‍🎤",
  "avatar-3": "🧔🏾‍♂️",
  "avatar-4": "👨🏽‍🚀",
  "avatar-5": "👩🏾‍🚀",
  "avatar-6": "🧙🏽‍♂️",
};

const ATLAS_IDS = new Set(Array.from({ length: 30 }, (_, i) => `${i < 10 ? "premium" : "elite"}-${String(i < 10 ? i + 1 : i - 9).padStart(2, "0")}`));
function atlasStyle(id: string): React.CSSProperties | null {
  if (!ATLAS_IDS.has(id)) return null;
  const n = id.startsWith("premium-") ? Number(id.slice(8)) : 10 + Number(id.slice(6));
  const i = n - 1;
  return {
    display: "inline-block",
    width: "1em",
    height: "1em",
    verticalAlign: "middle",
    backgroundImage: "url('/avatars/premium-elite-atlas.jpg')",
    backgroundSize: "500% 600%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: `${(i % 5) * 25}% ${Math.floor(i / 5) * 20}%`,
    borderRadius: "50%",
    overflow: "hidden",
  };
}

export default function EquippedAvatar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [avatar, setAvatar] = useState("default");
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/customization", { cache: "no-store" });
        const d = await r.json();
        if (alive && r.ok) setAvatar(String(d.equippedAvatar || "default"));
      } catch {}
    };
    load();
    const sync = () => load();
    window.addEventListener("focus", sync);
    window.addEventListener("ludo-wallet-updated", sync);
    return () => { alive = false; window.removeEventListener("focus", sync); window.removeEventListener("ludo-wallet-updated", sync); };
  }, []);
  const atlas = atlasStyle(avatar);
  if (atlas) return <span className={className} style={{ ...atlas, ...style }} aria-label="Player avatar" />;
  return <span className={className} style={style} aria-label="Player avatar">{AVATAR_ICONS[avatar] || AVATAR_ICONS.default}</span>;
}
