"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "ludo-live:last-session-v1";
const SKIP = new Set(["/", "/login", "/signup", "/auth", "/api"]);

export default function SessionResume() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || SKIP.has(pathname) || pathname.startsWith("/api/")) return;
    const params = window.location.search;
    const hash = window.location.hash;
    const snapshot = JSON.stringify({ pathname, params, hash, savedAt: Date.now() });
    try { sessionStorage.setItem(KEY, snapshot); } catch {}
  }, [pathname]);

  return null;
}

export function clearResumableSession() {
  try { sessionStorage.removeItem(KEY); } catch {}
}
