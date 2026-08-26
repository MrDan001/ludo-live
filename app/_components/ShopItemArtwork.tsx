"use client";

type Props = {
  item: {
    icon?: string;
    name?: string;
  };
};

export default function ShopItemArtwork({ item }: Props) {
  return (
    <span className="text-5xl leading-none" aria-label={item.name ?? "Shop item"}>
      {item.icon ?? "🛍️"}
    </span>
  );
}
