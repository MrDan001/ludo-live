"use client";

const PLACEHOLDER_FRIENDS = [
  { name: "Aarav", status: "Online" },
  { name: "Sneha", status: "Online" },
  { name: "Rohan", status: "In Game" },
];

export default function FriendsSidebar() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 w-full max-w-xs">
      <div className="text-white font-semibold mb-3">Friends Online</div>
      <div className="flex flex-col gap-2">
        {PLACEHOLDER_FRIENDS.map((f) => (
          <div key={f.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs">
                {f.name.charAt(0)}
              </div>
              <span className="text-white text-sm">{f.name}</span>
            </div>
            <span
              className={`text-xs ${f.status === "Online" ? "text-emerald-400" : "text-amber-400"}`}
            >
              {f.status}
            </span>
          </div>
        ))}
      </div>
      <p className="text-slate-500 text-xs mt-3">Friends system coming soon</p>
    </div>
  );
}