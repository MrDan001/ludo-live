import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./home.css";
import "./board-skin-overlay.css";
import "./ludo-mobile-polish.css";
import "./ludo-multiplayer-reference.css";
import "./ludo-multiplayer-final-balance.css";
import "./multiplayer-header-fix.css";
import GameSocialOverlay from "./_components/GameSocialOverlay";
import LudoAudio from "./_components/LudoAudio";
import SessionResume from "./_components/SessionResume";
import XPLevelCelebration from "./_components/XPLevelCelebration";
import XPWinWatcher from "./_components/XPWinWatcher";
import ActiveSpinRewards from "./_components/ActiveSpinRewards";
import MissionGameplayTracker from "./_components/MissionGameplayTracker";
import NotificationGate from "./_components/NotificationGate";
import SuspendedGate from "./_components/SuspendedGate";
import PlayerNotificationPopup from "./_components/PlayerNotificationPopup";
import AdminPlayerModeration from "./_components/AdminPlayerModeration";
import AppShell from "./AppShell";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Ludo Live",
  description: "Ludo Live — real-time Ludo, rooms, friends and chat",
  applicationName: "Ludo Live",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ludo Live", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" }
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, minimumScale: 1,
  userScalable: false, viewportFit: "cover", themeColor: "#07152d"
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><ServiceWorkerRegistration /><SessionResume /><Suspense fallback={null}><AppShell>{children}</AppShell></Suspense><Suspense fallback={null}><GameSocialOverlay /></Suspense><Suspense fallback={null}><LudoAudio /></Suspense><XPLevelCelebration /><XPWinWatcher /><ActiveSpinRewards /><MissionGameplayTracker /><NotificationGate /><SuspendedGate /><PlayerNotificationPopup /><AdminPlayerModeration /></body></html>;
}