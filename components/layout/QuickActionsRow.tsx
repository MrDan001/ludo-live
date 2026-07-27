"use client";

import Link from "next/link";

const ITEMS = [
  { icon: "🎁", label: "Daily Reward", href: "/daily-reward" },
  { icon: "🛒", label: "Shop", href: "/shop" },
  { icon: "📅", label: "Events", href: "/events" },
  { icon: "🎡", label: "Spin Wheel", href: "/spin-wheel" },
];

export default function QuickActionsRow() {
  return (
    <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col items-center gap-1 bg-slate-800 rounded-xl py-3"
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-slate-300 text-[10px] text-center leading-tight">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}