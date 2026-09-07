import type { Metadata } from "next";
import DbasePwaGate from "./DbasePwaGate";
import "./dbase.css";

export const metadata: Metadata = {
  title: "DBASE Admin — Ludo Live",
  applicationName: "Ludo Live DBASE Admin",
  manifest: "/dbase/manifest.webmanifest",
  appleWebApp: { capable: true, title: "DBASE Admin", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DbasePwaGate>{children}</DbasePwaGate>;
}