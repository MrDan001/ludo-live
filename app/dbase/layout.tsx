import type { Metadata } from "next";
import "./dbase.css";

export const metadata: Metadata = {
  title: "DBASE Admin — Ludo Live",
  applicationName: "Ludo Live Admin Console",
  appleWebApp: {
    capable: true,
    title: "DBASE Admin",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}