"use client";

import MultiplayerGameCanonical from "../game/MultiplayerGameCanonical";

export const dynamic = "force-dynamic";

/**
 * Regular multiplayer entry point.
 *
 * Keep this route on the same canonical multiplayer renderer used by the
 * existing multiplayer game component so the live room shows the full
 * player | LUDO LIVE | opponent header.
 *
 * Tournament routing is intentionally not changed here.
 */
export default function OnlineGamePage() {
  return <MultiplayerGameCanonical />;
}
