"use client";

interface HomeHeaderProps {
  name: string;
  coins: number;
  gems: number;
}

export default function HomeHeader({ name, coins, gems }: HomeHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-white font-semibold text-sm">{name}</div>
          <div className="text-emerald-400 text-xs">Rookie</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-700 px-2 py-1 rounded-full">
          <span>🪙</span>
          <span className="text-white text-sm font-semibold">{coins.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-700 px-2 py-1 rounded-full">
          <span>💎</span>
          <span className="text-white text-sm font-semibold">{gems}</span>
        </div>
      </div>
    </div>
  );
}