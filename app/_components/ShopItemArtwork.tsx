"use client";

import Image from "next/image";
import AvatarArtwork from "./AvatarArtwork";

type Props = {
  item: {
    id?: string;
    type?: string;
    icon?: string;
    image?: string | null;
    imageUrl?: string | null;
    rarity?: string;
    name?: string;
  };
};

function isImagePath(value: unknown): value is string {
  return typeof value === "string" && /^(https?:\/\/|\/)/.test(value);
}

export default function ShopItemArtwork({ item }: Props) {
  const id = String(item.id ?? "").toLowerCase();
  const premium = /^(premium|elite)-\d{2}$/.test(id);

  // Premium/elite artwork is a single 5x6 sprite sheet. Always prefer the
  // sprite renderer for these IDs; the catalogue's legacy icon/image fields
  // point at individual files that are intentionally not deployed.
  if (premium) {
    return (
      <div
        className="shop-avatar-artwork"
        style={{
          width: 96,
          height: 96,
          minWidth: 96,
          minHeight: 96,
          display: "block",
          overflow: "hidden",
          borderRadius: 16,
          flex: "0 0 96px",
        }}
      >
        <AvatarArtwork id={id} size={96} style={{ width: 96, height: 96 }} />
      </div>
    );
  }

  const image = isImagePath(item.imageUrl) ? item.imageUrl : isImagePath(item.image) ? item.image : null;

  if (image) {
    return (
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
        <Image
          src={image}
          alt={item.name ?? "Shop item"}
          fill
          sizes="96px"
          className="object-contain"
          unoptimized={image.startsWith("http")}
        />
      </div>
    );
  }

  if (isImagePath(item.icon)) {
    return (
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
        <Image src={item.icon} alt={item.name ?? "Shop item"} fill sizes="96px" className="object-contain" />
      </div>
    );
  }

  return <span className="text-5xl leading-none" aria-hidden="true">{item.icon ?? "🛍️"}</span>;
}
