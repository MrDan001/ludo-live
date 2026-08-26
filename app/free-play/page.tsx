"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppFrame from "../_components/AppFrame";
import FreePlayRoom from "../_components/FreePlayRoom";

function FreePlayContent() {
  const params = useSearchParams();
  const room = (params.get("room") || "").trim().toUpperCase();
  const size = Number(params.get("size") || "2") === 4 ? 4 : 2;
  return <FreePlayRoom initialCode={room} initialSize={size} create={!room} />;
}

export default function FreePlayPage() {
  return <Suspense fallback={<AppFrame back="/lobby"><p>Loading Free Play…</p></AppFrame>}><FreePlayContent /></Suspense>;
}
