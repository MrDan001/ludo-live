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

  return <span className={className} style={style} aria-label="Player avatar">{AVATAR_ICONS[avatar] || AVATAR_ICONS.default}</span>;
}
