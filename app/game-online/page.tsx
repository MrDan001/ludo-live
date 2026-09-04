"use client";

import { Suspense } from "react";
import OnlineMultiplayerChatRuntimeFix from "./OnlineMultiplayerChatRuntimeFix";
import HostCosmeticsRuntime from "./HostCosmeticsRuntime";
import MultiplayerReliabilityRuntime from "./MultiplayerReliabilityRuntime";
import MultiplayerConnectionStatus from "./MultiplayerConnectionStatus";

export const dynamic = "force-dynamic";

export default function OnlineGamePage() {
  return <Suspense fallback={<main style={{ minHeight: "100dvh", background: "#000" }} />}><MultiplayerReliabilityRuntime /><MultiplayerConnectionStatus /><HostCosmeticsRuntime /><OnlineMultiplayerChatRuntimeFix /></Suspense>;
}
