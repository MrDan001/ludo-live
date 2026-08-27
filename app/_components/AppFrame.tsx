"use client";

import { useEffect } from "react";
import WinnerCelebration from "./WinnerCelebration";
import ForfeitControl from "./ForfeitControl";

export default function AppFrame({ children, back = "/home", backLabel = "← Back", hideBack = false }: { children: React.ReactNode; back?: string; backLabel?: string; hideBack?: boolean }) {
  useEffect(() => {
    const handlePopState = () => {
      window.location.href = "/home";
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const goBack = () => {
    window.location.href = "/home";
  };

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #10265d 0%, #020817 48%, #01030a 100%)", color: "#fff", padding: "18px 12px 32px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {!hideBack && <button type="button" onClick={goBack} style={{ color: "#93c5fd", background: "transparent", border: 0, padding: 0, fontSize: 16, fontWeight: 700, display: "inline-block", marginBottom: 16, cursor: "pointer" }}>{backLabel}</button>}
        {children}
      </div>
      <WinnerCelebration />
      <ForfeitControl />
    </main>
  );
}
