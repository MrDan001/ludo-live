// FILE PATH: app/page.tsx
// This is the Splash Screen. Replace the full contents of app/page.tsx with everything below this line.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

const PAWN_COLORS = [
  { color: "#ef4444", left: "18%" },
  { color: "#22c55e", left: "38%" },
  { color: "#3b82f6", left: "58%" },
  { color: "#eab308", left: "78%" },
];

interface Star {
  top: number;
  left: number;
  opacity: number;
}

const STAR_COUNT = 24;

export default function SplashPage() {
  const router = useRouter();
  const { checkSession, user, loading } = useAuth();
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Generate random star positions only on the client, after mount.
    // Doing this during render (or with SSR) causes a hydration mismatch
    // because Math.random() produces different values on server vs client.
    setStars(
      Array.from({ length: STAR_COUNT }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        opacity: Math.random() * 0.8 + 0.2,
      }))
    );
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      router.push(user ? "/home" : "/login");
    }, 1800);
    return () => clearTimeout(timer);
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      {/* scattered star sparkles */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>

      {/* pawns row */}
      <div className="relative w-64 h-16 mb-2">
        {PAWN_COLORS.map((p, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-8 h-12"
            style={{ left: p.left }}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white/30"
              style={{ backgroundColor: p.color }}
            />
            <div
              className="w-3 h-5 mx-auto -mt-1 rounded-b-full border-2 border-t-0 border-white/30"
              style={{ backgroundColor: p.color }}
            />
          </div>
        ))}
      </div>

      {/* crown */}
      <div className="text-4xl -mb-4">👑</div>

      {/* title */}
      <h1 className="text-6xl font-extrabold tracking-wide">
        <span className="text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]">LUDO</span>
      </h1>
      <h1 className="text-6xl font-extrabold tracking-wide -mt-4">
        <span className="text-emerald-400 drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]">LIVE</span>
      </h1>

      {/* dice */}
      <div className="text-2xl mt-1">🎲</div>

      <p className="text-slate-300 text-xs tracking-[0.3em] uppercase mt-1">
        Play. Talk. Win.
      </p>

      <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden mt-6">
        <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 animate-[loadbar_1.8s_ease-in-out_forwards]" />
      </div>
      <p className="text-slate-500 text-xs">Loading...</p>

      <style>{`
        @keyframes loadbar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}