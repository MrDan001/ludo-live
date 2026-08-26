"use client";

type Props = { item: { icon?: string; name?: string; imageUrl?: string | null } };

export default function ShopItemArtwork({ item }: Props) {
  if (item.imageUrl) {
    return <img src={item.imageUrl} alt={item.name ?? "Shop avatar"} className="h-full w-full object-contain" loading="lazy" />;
  }
  return <span className="text-5xl leading-none" aria-label={item.name ?? "Shop item"}>{item.icon ?? "🛍️"}</span>;
}
