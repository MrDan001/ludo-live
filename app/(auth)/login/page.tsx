"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

const MIN_PASSWORD_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const { signInAsGuest, signInWithEmail, signUpWithEmail, resendConfirmationEmail } = useAuth();

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  async function handleResend() {
    if (!email.trim() || resendCooldown > 0) return;
    setResending(true);
    const { error } = await resendConfirmationEmail(email.trim());
    setResending(false);
    if (error) {
      setError(error);
    } else {
      setInfo("Confirmation email sent — check your inbox (and spam folder).");
      setResendCooldown(30);
    }
  }

  async function handleGuest() {
    setBusy(true);
    setError(null);
    const { error } = await signInAsGuest();
    setBusy(false);
    if (error) setError(error);
    else router.push("/home");
  }

  function validate(): string | null {
    if (!email.trim() || !email.includes("@")) return "Enter a valid email address";
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (tab === "signup" && password !== confirmPassword) return "Passwords don't match";
    return null;
  }

  // Takes the mode explicitly rather than reading it from state, so there's
  // no risk of a stale closure sending the wrong request on the first click
  // right after switching tabs.
  async function handleSubmit(activeTab: "signin" | "signup") {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);
    setShowResend(false);

    const fn = activeTab === "signup" ? signUpWithEmail : signInWithEmail;
    const { error } = await fn(email.trim(), password);
    setBusy(false);

    if (error) {
      setError(error);
      // Supabase's message for this case is something like "Email not
      // confirmed" - surface the resend option right where the person
      // is stuck, instead of making them go dig for it.
      if (/not confirmed/i.test(error)) setShowResend(true);
      return;
    }

    if (activeTab === "signup") {
      // Supabase projects with "Confirm email" enabled won't return an
      // active session yet - the account exists, but sign-in only works
      // after the person clicks the link in their inbox.
      setInfo("Account created! Check your email to confirm, then sign in.");
      setShowResend(true);
      setTab("signin");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    router.push("/home");
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

        <div className="text-center text-slate-500 text-xs my-1">or use email</div>

        {/* Sign In / Sign Up tabs */}
        <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => {
              setTab("signin");
              setError(null);
              setInfo(null);
              setShowResend(false);
            }}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === "signin" ? "bg-emerald-600 text-white" : "text-slate-400"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab("signup");
              setError(null);
              setInfo(null);
              setShowResend(false);
            }}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === "signup" ? "bg-emerald-600 text-white" : "text-slate-400"
            }`}
          >
            Sign Up
          </button>
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
          className="px-4 py-2 rounded-lg bg-white text-slate-900 placeholder-slate-400 border border-slate-300"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          autoComplete={tab === "signup" ? "new-password" : "current-password"}
          className="px-4 py-2 rounded-lg bg-white text-slate-900 placeholder-slate-400 border border-slate-300"
        />
        {tab === "signup" && (
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            type="password"
            autoComplete="new-password"
            className="px-4 py-2 rounded-lg bg-white text-slate-900 placeholder-slate-400 border border-slate-300"
          />
        )}

        <button
          onClick={() => handleSubmit(tab)}
          disabled={busy}
          className="bg-emerald-600 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
        >
          {busy ? "Please wait..." : tab === "signup" ? "Create Account" : "Sign In"}
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        {info && <p className="text-emerald-400 text-sm text-center">{info}</p>}

        {showResend && (
          <button
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="text-slate-400 text-xs underline text-center disabled:opacity-50"
          >
            {resending
              ? "Sending..."
              : resendCooldown > 0
              ? `Resend confirmation email (${resendCooldown}s)`
              : "Resend confirmation email"}
          </button>
        )}
      </div>

      <p className="text-slate-500 text-xs text-center mt-4 max-w-xs">
        By continuing you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}