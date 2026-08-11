import Link from "next/link";

const LINKS = [
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-wide">
          <span className="text-xl">👑</span>
          <span className="text-white">LUDO</span>
          <span className="text-emerald-400">LIVE</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-300">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
          <Link
            href="/"
            className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-1.5 transition-colors"
          >
            Play Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
