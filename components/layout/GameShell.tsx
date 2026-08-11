// Fixed-viewport wrapper for the game app shell (home, room, play, auth, etc).
// This used to be applied globally on <body>, which broke scrolling on the
// public content pages (blog, about, privacy). Scoping it here keeps the
// in-game feel identical while letting content pages scroll normally.
export default function GameShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh w-full overflow-hidden overscroll-none flex flex-col">
      {children}
    </div>
  );
}
