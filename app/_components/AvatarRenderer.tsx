"use client";

import type { CSSProperties, ReactNode } from "react";

export type AvatarArtwork = {
  id?: string;
  name?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
};

type Props = {
  avatar: AvatarArtwork;
  className?: string;
  style?: CSSProperties;
  size?: number | string;
  border?: string;
  background?: string;
  fallback?: ReactNode;
  onImageError?: () => void;
};

export default function AvatarRenderer({
  avatar,
  className,
  style,
  size = "100%",
  border,
  background = "transparent",
  fallback,
  onImageError,
}: Props) {
  const frameStyle: CSSProperties = {
    width: size,
    height: size,
    aspectRatio: "1 / 1",
    flex: "0 0 auto",
    position: "relative",
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    overflow: "hidden",
    borderRadius: "50%",
    background,
    border,
    isolation: "isolate",
    ...style,
  };

  return (
    <span className={className} style={frameStyle} aria-label={avatar.name || "Player avatar"}>
      {avatar.imageUrl ? (
        <img
          src={avatar.imageUrl}
          alt=""
          draggable={false}
          decoding="async"
          loading="lazy"
          onError={onImageError}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            minWidth: 0,
            minHeight: 0,
            objectFit: "contain",
            objectPosition: "center",
          }}
        />
      ) : (
        <span style={{ position: "relative", zIndex: 1, lineHeight: 1, fontSize: "58%" }}>
          {fallback ?? avatar.icon ?? "🧑🏽‍🎮"}
        </span>
      )}
    </span>
  );
}
