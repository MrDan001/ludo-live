"use client";

import Link from "next/link";

interface ActionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  gradient: string;
  href: string;
}

export default function ActionCard({ icon, title, subtitle, gradient, href }: ActionCardProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-2xl p-4 ${gradient} shadow-lg active:scale-[0.98] transition-transform`}
    >
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-white font-bold text-base">{title}</div>
        <div className="text-white/80 text-xs">{subtitle}</div>
      </div>
    </Link>
  );
}