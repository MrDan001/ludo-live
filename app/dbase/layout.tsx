import type { Metadata } from "next";
import DbasePwaGate from "./DbasePwaGate";
import "./dbase.css";

export const metadata: Metadata = {
  title: "Ludo Live Admin",
  description: "Ludo Live administrative management console.",
  applicationName: "Ludo Live Admin",
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ludo Live Admin",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DbasePwaGate>{children}</DbasePwaGate>;
}
