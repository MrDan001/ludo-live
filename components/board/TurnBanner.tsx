"use client";

interface TurnBannerProps {
  text: string;
  /** True when it's the local player's own turn - gets an emphasized
   *  (brighter) treatment vs. a neutral "waiting on someone else" look. */
  isYou?: boolean;
}

/** The big pill banner below the board announcing whose turn it is. */
export default function TurnBanner({ text, isYou }: TurnBannerProps) {
  return (
    <div
      style={{ maxWidth: "min(94%, 420px)", fontSize: "min(5.6vw, 23px)" }}
      className={[
        "w-full text-center py-3 rounded-full font-black tracking-wide shadow-lg border-2 shrink-0",
        isYou
          ? "bg-emerald-600 border-emerald-300 text-white animate-pulse"
          : "bg-slate-700 border-slate-500 text-slate-200",
      ].join(" ")}
    >
      {text}
    </div>
  );
}
