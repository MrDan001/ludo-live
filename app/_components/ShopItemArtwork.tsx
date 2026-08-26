"use client";

import { useState } from "react";

type Props = { item: { icon?: string | null; name?: string; imageUrl?: string | null } };

export default function ShopItemArtwork({ item }: Props) {
  const [broken, setBroken] = useState(false);

  if (item.imageUrl && !broken) {
    return (
      <span
        className="shop-item-artwork"
        style={{ position: "relative", display: "flex", width: "100%", height: "100%", minWidth: 0, minHeight: 0, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      >
        <img
          src={item.imageUrl}
          alt={item.name ?? "Shop avatar"}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          style={{ display: "block", width: "100%", height: "100%", minWidth: 0, minHeight: 0, objectFit: "contain", objectPosition: "center center" }}
        />
      </span>
    );
  }

  return <span className="text-5xl leading-none" aria-label={item.name ?? "Shop item"}>{item.icon ?? "🛍️"}</span>;
}
