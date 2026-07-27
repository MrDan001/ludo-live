"use client";

export default function StarterPackCard() {
  return (
    <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-xl p-4 w-full max-w-xs relative overflow-hidden">
      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
        3x Value
      </div>
      <div className="text-white font-bold mb-1">Starter Pack</div>
      <div className="text-amber-200 text-sm mb-3">Coins + Gems bundle</div>
      <button
        disabled
        className="bg-white text-slate-900 font-bold px-4 py-2 rounded-lg opacity-60 cursor-not-allowed"
      >
        $1.99 (soon)
      </button>
    </div>
  );
}