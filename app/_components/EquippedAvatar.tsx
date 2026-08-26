"use client";

import { useEffect, useState } from "react";
import AvatarRenderer, { type AvatarArtwork } from "./AvatarRenderer";

export const AVATAR_ICONS: Record<string, string> = {
  default: "🧑🏽‍🎮", "avatar-1": "🧑🏽‍🎮", "avatar-2": "👩🏽‍🎤", "avatar-3": "🧔🏾‍♂️", "avatar-4": "👨🏽‍🚀", "avatar-5": "👩🏾‍🚀", "avatar-6": "🧙🏽‍♂️",
};

type Avatar = AvatarArtwork & { id: string };

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

  const displayAvatar = broken ? { ...avatar, imageUrl: null } : avatar;
  return (
    <AvatarRenderer
      avatar={displayAvatar}
      className={className}
      style={style}
      onImageError={() => setBroken(true)}
      fallback={avatar.icon || AVATAR_ICONS[avatar.id] || AVATAR_ICONS.default}
    />
  );
}
