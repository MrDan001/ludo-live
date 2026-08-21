import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import GameSocialOverlay from "./_components/GameSocialOverlay";

export const metadata: Metadata = { title: "Ludo Live", description: "Ludo Live — clean rebuild" };

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><Suspense fallback={null}>{children}</Suspense><Suspense fallback={null}><GameSocialOverlay /></Suspense></body></html>;
}
