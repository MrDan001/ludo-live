import type { Metadata } from "next";
import DbasePwaGate from "./DbasePwaGate";
import "./dbase.css";
export const metadata: Metadata = { title: "DBASE Admin — Ludo Live", manifest: "/dbase-manifest.webmanifest", applicationName: "Ludo Live DBASE Admin" };
export default function AdminLayout({children}:{children:React.ReactNode}){return <DbasePwaGate>{children}</DbasePwaGate>}