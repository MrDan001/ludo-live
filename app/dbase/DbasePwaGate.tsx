"use client";

import { useEffect } from "react";

export default function DbasePwaGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/dbase/sw.js", {
      scope: "/dbase/",
      updateViaCache: "none",
    }).catch(() => {});
  }, []);

  return <>{children}</>;
}
