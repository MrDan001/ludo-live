import Link from "next/link";

export default function AppFrame({ children, back = "/home" }: { children: React.ReactNode; back?: string }) {
  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #10265d 0%, #020817 48%, #01030a 100%)", color: "#fff", padding: "18px 12px 32px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22 }}>
          <Link href="/home" style={{ color: "#fff", textDecoration: "none", fontWeight: 950, fontSize: 22 }}>🎲 Ludo Live</Link>
          <nav style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/profile" style={navStyle}>👤 Profile</Link>
            <Link href="/shop" style={navStyle}>🛍️ Shop</Link>
            <Link href="/rewards" style={navStyle}>🎁 Reward</Link>
            <Link href="/how-to" style={navStyle}>How to Play</Link>
            <Link href="/settings" style={navStyle}>⚙️</Link>
          </nav>
        </header>
        {back !== "" && <Link href={back} style={{ color: "#93c5fd", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 16 }}>← Back</Link>}
        {children}
      </div>
    </main>
  );
}

const navStyle = { color: "#dbeafe", textDecoration: "none", padding: "8px 9px", borderRadius: 10, background: "rgba(255,255,255,.07)", fontSize: 12, fontWeight: 800, border: "1px solid rgba(148,163,184,.08)" };