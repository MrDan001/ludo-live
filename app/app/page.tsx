"use client";

import { useEffect, useState } from "react";
import AccountPage from "../account/page";

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return displayMode || fullscreen || iosStandalone;
}

export default function AppEntryPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isStandalonePwa()) {
      window.location.replace("/open-app");
      return;
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  return <AccountPage />;
}
