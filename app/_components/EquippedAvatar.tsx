"use client";

import { useEffect, useState } from "react";
import AvatarRenderer, { type AvatarArtwork } from "./AvatarRenderer";

export const AVATAR_ICONS: Record<string, string> = {
  default: "🧑🏽‍🎮", "avatar-1": "🧑🏽‍🎮", "avatar-2": "👩🏽‍🎤", "avatar-3": "🧔🏾‍♂️", "avatar-4": "👨🏽‍🚀", "avatar-5": "👩🏽‍🚀", "avatar-6": "🧙🏽‍♂️",
};

type Avatar = AvatarArtwork & { id: string };
type CustomizationPayload = { equippedAvatar?: string; avatars?: Avatar[] };

// One in-flight/shared request per browser session prevents every avatar surface
// from independently waiting on /api/customization. A short TTL keeps normal
// navigation instant while still allowing server-side changes to propagate.
let cached: CustomizationPayload | null = null;
let cachedAt = 0;
let inFlight: Promise<CustomizationPayload | null> | null = null;
const CACHE_TTL_MS = 30_000;

function invalidateAvatarCache() {
  cached = null;
  cachedAt = 0;
}

async function loadCustomization(force = false): Promise<CustomizationPayload | null> {
  const now = Date.now();
  if (!force && cached && now - cachedAt < CACHE_TTL_MS) return cached;
  if (!force && inFlight) return inFlight;

  inFlight = fetch("/api/customization", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) return null;
      const data = (await r.json()) as CustomizationPayload;
      cached = data;
      cachedAt = Date.now();
      return data;
    })
    .catch(() => null)
    .finally(() => { inFlight = null; });

  return inFlight;
}

function preloadAvatar(avatar: Avatar | null | undefined) {
  if (!avatar?.imageUrl || typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = avatar.imageUrl;
}

export default function EquippedAvatar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [avatar, setAvatar] = useState<Avatar>({ id: "default", icon: AVATAR_ICONS.default });
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let alive = true;
    const apply = (d: CustomizationPayload | null) => {
      if (!alive || !d) return;
      const id = String(d.equippedAvatar || "default");
      const found = (Array.isArray(d.avatars) ? d.avatars : []).find((x) => x.id === id);
      const next = found || { id, icon: AVATAR_ICONS[id] || AVATAR_ICONS.default };
      setBroken(false);
      setAvatar(next);
      preloadAvatar(next);
    };

    void loadCustomization().then(apply);

    // Equipping/purchasing already emits this event. Invalidate once, then all
    // mounted avatar components share the same refresh instead of issuing N calls.
    const sync = () => {
      invalidateAvatarCache();
      void loadCustomization(true).then(apply);
    };
    window.addEventListener("focus", sync);
    window.addEventListener("ludo-wallet-updated", sync);
    window.addEventListener("ludo-avatar-updated", sync);
    return () => {
      alive = false;
      window.removeEventListener("focus", sync);
      window.removeEventListener("ludo-wallet-updated", sync);
      window.removeEventListener("ludo-avatar-updated", sync);
    };
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
