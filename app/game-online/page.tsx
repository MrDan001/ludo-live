"use client";

import { Suspense } from "react";
import OnlineMultiplayerGame from "./OnlineMultiplayerGame";

export const dynamic = "force-dynamic";

export default function OnlineGamePage() {
  return <Suspense fallback={<main style={{ minHeight: "100dvh", background: "#000" }} />}><OnlineMultiplayerGame /></Suspense>;
}
