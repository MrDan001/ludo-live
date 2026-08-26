"use client";

import Image from "next/image";

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
  const image = isImagePath(item.imageUrl) ? item.imageUrl : isImagePath(item.image) ? item.image : null;

  if (image) {
    return (
      <div className="relative h-24 w-24 overflow-hidden rounded-2xl">
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
      <div className="relative h-24 w-24 overflow-hidden rounded-2xl">
        <Image src={item.icon} alt={item.name ?? "Shop item"} fill sizes="96px" className="object-contain" />
      </div>
    );
  }

  return <span className="text-5xl leading-none" aria-hidden="true">{item.icon ?? "🛍️"}</span>;
}
