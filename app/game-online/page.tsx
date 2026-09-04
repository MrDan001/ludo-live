"use client";

import { Suspense } from "react";
import OnlineMultiplayerChatRuntimeFix from "./OnlineMultiplayerChatRuntimeFix";
import HostCosmeticsRuntime from "./HostCosmeticsRuntime";

export const dynamic = "force-dynamic";

export default function OnlineGamePage() {
  return <Suspense fallback={<main style={{ minHeight: "100dvh", background: "#000" }} />}><HostCosmeticsRuntime /><OnlineMultiplayerChatRuntimeFix /></Suspense>;
}
