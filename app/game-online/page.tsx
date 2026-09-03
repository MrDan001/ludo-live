"use client";

import { Suspense } from "react";
import OnlineMultiplayerChatRuntimeFix from "./OnlineMultiplayerChatRuntimeFix";
import OnlineMultiplayerForfeitCelebration from "./OnlineMultiplayerForfeitCelebration";

export const dynamic = "force-dynamic";

export default function OnlineGamePage() {
  return <Suspense fallback={<main style={{ minHeight: "100dvh", background: "#000" }} />}><OnlineMultiplayerChatRuntimeFix /><OnlineMultiplayerForfeitCelebration /></Suspense>;
}
