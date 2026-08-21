import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import GameSocialOverlay from "./_components/GameSocialOverlay";
import AppShell from "./AppShell";

export const metadata: Metadata = { title: "Ludo Live", description: "Ludo Live — real-time Ludo" };

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><Suspense fallback={null}><AppShell>{children}</AppShell></Suspense><Suspense fallback={null}><GameSocialOverlay /></Suspense></body></html>;
}
