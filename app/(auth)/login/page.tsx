"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { signInAsGuest, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGuest() {
    setBusy(true);
    setError(null);
    const { error } = await signInAsGuest();
    setBusy(false);
    if (error) setError(error);
    else router.push("/home");
  }

  async function handleEmailSubmit() {
    setBusy(true);
    setError(null);
    const fn = mode === "signup" ? signUpWithEmail : signInWithEmail;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) setError(error);
    else router.push("/home");
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-white text-3xl font-extrabold">
        LUDO <span className="text-emerald-400">LIVE</span>
      </h1>
      <p className="text-slate-400 text-xs tracking-widest uppercase mb-4">Play. Talk. Win.</p>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          disabled
          className="bg-white text-slate-800 font-semibold py-3 rounded-lg opacity-50 cursor-not-allowed"
        >
          Continue with Google (soon)
        </button>
        <button
          disabled
          className="bg-blue-700 text-white font-semibold py-3 rounded-lg opacity-50 cursor-not-allowed"
        >
          Continue with Facebook (soon)
        </button>
        <button
          disabled
          className="bg-green-600 text-white font-semibold py-3 rounded-lg opacity-50 cursor-not-allowed"
        >
          Continue with Phone (soon)
        </button>

        <button
          onClick={handleGuest}
          disabled={busy}
          className="bg-blue-900 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
        >
          Continue as Guest
        </button>

        <div className="text-center text-slate-500 text-xs my-2">or use email</div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="px-4 py-2 rounded-lg bg-white text-slate-900 placeholder-slate-400 border border-slate-300"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          className="px-4 py-2 rounded-lg bg-white text-slate-900 placeholder-slate-400 border border-slate-300"
        />

        <div className="flex gap-2">
          <button
            onClick={() => { setMode("signin"); handleEmailSubmit(); }}
            disabled={busy}
            className="flex-1 bg-emerald-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); handleEmailSubmit(); }}
            disabled={busy}
            className="flex-1 bg-slate-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            Sign Up
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>

      <p className="text-slate-500 text-xs text-center mt-4 max-w-xs">
        By continuing you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}