"use client";

import { useEffect, useState } from "react";

export const AVATAR_ICONS: Record<string, string> = {
  default: "🧑🏽‍🎮", "avatar-1": "🧑🏽‍🎮", "avatar-2": "👩🏽‍🎤", "avatar-3": "🧔🏾‍♂️", "avatar-4": "👨🏽‍🚀", "avatar-5": "👩🏾‍🚀", "avatar-6": "🧙🏽‍♂️",
};

type Avatar = { id: string; name?: string; icon?: string | null; imageUrl?: string | null };

export default function EquippedAvatar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [avatar, setAvatar] = useState<Avatar>({ id: "default", icon: AVATAR_ICONS.default });
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/customization", { cache: "no-store" });
        const d = await r.json();
        if (!alive || !r.ok) return;
        const id = String(d.equippedAvatar || "default");
        const found = (Array.isArray(d.avatars) ? d.avatars : []).find((x: Avatar) => x.id === id);
        setBroken(false);
        setAvatar(found || { id, icon: AVATAR_ICONS[id] || AVATAR_ICONS.default });
      } catch {}
    };
    void load();
    const sync = () => void load();
    window.addEventListener("focus", sync);
    window.addEventListener("ludo-wallet-updated", sync);
    return () => { alive = false; window.removeEventListener("focus", sync); window.removeEventListener("ludo-wallet-updated", sync); };
  }, []);

  if (avatar.imageUrl && !broken) {
    return <img src={avatar.imageUrl} alt={avatar.name || "Player avatar"} className={className} style={{ ...style, display: "block", width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", objectPosition: "center center" }} onError={() => setBroken(true)} decoding="async" />;
  }

  return <span className={className} style={style} aria-label={avatar.name || "Player avatar"}>{avatar.icon || AVATAR_ICONS[avatar.id] || AVATAR_ICONS.default}</span>;
}
