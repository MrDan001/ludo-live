"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";

const COIN_PACKS = [
  { amount: "10,000", price: "₦89.00" },
  { amount: "25,000", price: "₦179.00" },
  { amount: "50,000", price: "₦349.00", badge: "POPULAR" },
  { amount: "110,000", price: "₦699.00" },
  { amount: "250,000", price: "₦1,599.00", badge: "BEST VALUE" },
];

const TABS = ["Coins", "Gems", "Items", "Avatars"];

export default function ShopPage() {
  const router = useRouter();
  const { coins, gems } = useAuth();
  const [activeTab, setActiveTab] = useState("Coins");

  return (
    <div className="min-h-screen bg-slate-900 pb-24 flex flex-col items-center gap-3 p-4">
      <div className="w-full flex items-center justify-between">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
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
        </div>
      </div>

      <div className="flex gap-2 w-full max-w-sm bg-slate-800 rounded-full p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-full text-sm font-semibold ${
              activeTab === tab ? "bg-blue-600 text-white" : "text-slate-400"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Coins" ? (
        <div className="flex flex-col gap-2 w-full max-w-sm">
          {COIN_PACKS.map((pack) => (
            <div
              key={pack.amount}
              className="bg-slate-800 rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🪙</span>
                <span className="text-white font-semibold">{pack.amount}</span>
                {pack.badge && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      pack.badge === "POPULAR" ? "bg-red-600" : "bg-amber-500 text-slate-900"
                    } text-white`}
                  >
                    {pack.badge}
                  </span>
                )}
              </div>
              <button
                disabled
                className="bg-emerald-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg opacity-60 cursor-not-allowed"
              >
                {pack.price}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 mt-8">Coming soon</p>
      )}

      <BottomNav />
    </div>
  );
}