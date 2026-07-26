"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function SplashPage() {
  const router = useRouter();
  const { checkSession, user, loading } = useAuth();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      router.push(user ? "/home" : "/login");
    }, 1500);
    return () => clearTimeout(timer);
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
      <h1 className="text-white text-5xl font-extrabold tracking-wide">
        LUDO <span className="text-emerald-400">LIVE</span>
      </h1>
      <p className="text-slate-400 text-sm tracking-widest uppercase">Play. Talk. Win.</p>
      <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden mt-6">
        <div className="h-full bg-emerald-400 animate-[loadbar_1.5s_ease-in-out_forwards]" />
      </div>
      <style>{`
        @keyframes loadbar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}