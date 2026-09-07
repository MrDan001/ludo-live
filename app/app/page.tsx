"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AccountPage from "../account/page";

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return standalone || fullscreen || iosStandalone;
}

export default function AppEntryPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isStandalonePwa()) {
      router.replace("/open-app");
      return;
    }

    document.cookie = "ludo_pwa=1; Path=/; Max-Age=31536000; SameSite=Lax";
  }, [router]);

  if (!isStandalonePwa()) return null;

  return <AccountPage />;
}
