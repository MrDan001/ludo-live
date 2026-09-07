"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_APP_PATHS = new Set(["/open-app", "/app"]);
const PUBLIC_CONTENT_PATHS = new Set(["/privacy", "/terms"]);

function isStandalonePwa() {
  if (typeof window === "undefined") return false;

  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return standalone || fullscreen || iosStandalone;
}

export default function PwaClientGate() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/dbase" || pathname.startsWith("/dbase/")) return;
    if (PUBLIC_APP_PATHS.has(pathname) || PUBLIC_CONTENT_PATHS.has(pathname)) return;
    if (!isStandalonePwa()) {
      window.location.replace("/open-app");
    }
  }, [pathname]);

  return null;
}
