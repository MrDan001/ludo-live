"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import BottomNav from "@/components/layout/BottomNav";

export default function ProfilePage() {
  const router = useRouter();
  const { user, name, coins, gems, checkSession, updateName } = useAuth();

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const displayName = name || user?.email?.split("@")[0] || "Player";

  const startEditing = () => {
    setNameInput(displayName);
    setNameError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!nameInput.trim() || nameInput.trim() === displayName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setNameError(null);
    const { error } = await updateName(nameInput.trim());
    setSaving(false);
    if (error) {
      setNameError(error);
      return;
    }
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24 flex flex-col items-center gap-4 p-4">
      <div className="w-full flex items-center justify-between">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <h1 className="text-white font-bold text-lg">Profile</h1>
        <button
          onClick={() => router.push("/settings")}
          aria-label="Settings"
          className="text-white text-xl active:scale-90 transition-transform"
        >
          ⚙️
        </button>
      </div>

      <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-white text-3xl font-bold border-4 border-amber-400 mt-2">
        {displayName.charAt(0).toUpperCase()}
      </div>

      {editing ? (
        <div className="flex flex-col items-center gap-1.5 w-full max-w-xs">
          <div className="flex items-center gap-2 w-full">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              maxLength={20}
              autoFocus
              className="flex-1 bg-slate-800 text-white text-center font-bold text-lg rounded-lg px-3 py-1.5 border border-slate-700 outline-none focus:border-amber-400"
            />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="text-slate-400 text-xs font-semibold px-3 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-emerald-400 text-xs font-semibold px-3 py-1 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          {nameError && <p className="text-red-400 text-xs text-center">{nameError}</p>}
        </div>
      ) : (
        <button onClick={startEditing} className="flex items-center gap-2 active:scale-95 transition-transform">
          <span className="text-white font-bold text-lg">{displayName}</span>
          <span className="text-slate-400">✏️</span>
        </button>
      )}

      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Level 25</span>
          <span>4250 / 8000</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400" style={{ width: "53%" }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full max-w-xs mt-2">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <div className="text-white font-bold">256</div>
          <div className="text-slate-400 text-[10px]">Total Games</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <div className="text-white font-bold">184</div>
          <div className="text-slate-400 text-[10px]">Games Won</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <div className="text-white font-bold">71%</div>
          <div className="text-slate-400 text-[10px]">Win Rate</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-2">
        <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-2">
          <span className="text-xl">🪙</span>
          <div>
            <div className="text-slate-400 text-[10px]">Coins</div>
            <div className="text-white font-bold">{coins.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-2">
          <span className="text-xl">💎</span>
          <div>
            <div className="text-slate-400 text-[10px]">Gems</div>
            <div className="text-white font-bold">{gems}</div>
          </div>
        </div>
      </div>

      <button className="w-full max-w-xs bg-slate-800 rounded-xl p-3 flex items-center justify-between mt-2">
        <span className="text-white text-sm">🏆 Achievements</span>
        <span className="text-slate-400">›</span>
      </button>
      <button className="w-full max-w-xs bg-slate-800 rounded-xl p-3 flex items-center justify-between">
        <span className="text-white text-sm">📜 History</span>
        <span className="text-slate-400">›</span>
      </button>

      <BottomNav />
    </div>
  );
}