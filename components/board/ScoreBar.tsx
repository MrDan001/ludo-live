"use client";

interface ScoreEntry {
  label: string;
  value: number;
  /** True for the score row belonging to the color whose turn it
   *  currently is - gets a subtle highlight. */
  active?: boolean;
}

interface ScoreBarProps {
  entries: ScoreEntry[];
}

/** The stacked "Name: N" score pills shown above the board - N is how
 *  many of that player's tokens have reached home. */
export default function ScoreBar({ entries }: ScoreBarProps) {
  return (
    <div className="flex flex-col gap-1 items-center shrink-0">
      {entries.map((entry) => (
        <div
          key={entry.label}
          style={{ fontSize: "min(3.8vw, 15px)" }}
          className={[
            "px-4 py-1 rounded-full font-bold whitespace-nowrap border",
            entry.active
              ? "bg-emerald-800/90 border-emerald-400 text-emerald-50"
              : "bg-slate-800/90 border-slate-600 text-slate-100",
          ].join(" ")}
        >
          {entry.label}: {entry.value}
        </div>
      ))}
    </div>
  );
}