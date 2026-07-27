"use client";

interface HomeHeaderProps {
  name: string;
  coins: number;
  gems: number;
}

export default function HomeHeader({ name, coins, gems }: HomeHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border-2 border-emerald-400">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-white font-semibold text-sm">{name}</div>
          <div className="flex items-center gap-1">
            <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 rounded">25</span>
            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 w-1/2" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-full">
          <span>🪙</span>
          <span className="text-white text-sm font-semibold">{coins.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-full">
          <span>💎</span>
          <span className="text-white text-sm font-semibold">{gems}</span>
        </div>
        <button className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-bold">
          +
        </button>
        <button className="text-white text-xl">☰</button>
      </div>
    </div>
  );
}