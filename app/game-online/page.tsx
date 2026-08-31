"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MultiplayerGameCanonical from "../game/MultiplayerGameCanonical";

export default function OnlineGamePage() {
  const params = useSearchParams();
  const [, setReady] = useState(false);

  useEffect(() => {
    const board = String(params.get("board") || "").trim();
    if (!board) {
      setReady(true);
      return;
    }
    setReady(true);
  }, [params]);

  return <MultiplayerGameCanonical />;
}
