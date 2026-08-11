import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 mt-16">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-slate-400">
        <p>© {new Date().getFullYear()} Ludo Live. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-white transition-colors">
            About
          </Link>
          <Link href="/contact" className="hover:text-white transition-colors">
            Contact
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
