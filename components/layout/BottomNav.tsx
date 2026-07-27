"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Home", icon: "🏠", href: "/home" },
  { label: "Shop", icon: "🛒", href: "/shop" },
  { label: "Collection", icon: "🎭", href: "/collection" },
  { label: "Rank", icon: "🏅", href: "/leaderboard" },
  { label: "Events", icon: "📅", href: "/events" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex justify-around py-2">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-xs ${
              active ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}