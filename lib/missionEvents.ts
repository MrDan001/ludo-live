type MissionEventKind = "play_games"|"win_games"|"roll_dice"|"move_tokens"|"send_messages"|"join_rooms"|"create_rooms"|"roll_sixes"|"move_home"|"complete_games";

/**
 * Sends a mission event to the server and notifies the Missions UI after a
 * successful write. A small retry protects normal gameplay events from a
 * transient network failure without changing the event id (the server's
 * unique constraint keeps retries idempotent).
 */
export async function recordMissionEvent(kind: MissionEventKind, amount = 1) {
  if (typeof window === "undefined" || !kind || amount <= 0) return false;

  const eventId = `mission-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const body = JSON.stringify({ action: "event", kind, amount, eventId });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        body,
      });

      if (!response.ok) throw new Error(`Mission event request failed: ${response.status}`);

      window.dispatchEvent(new CustomEvent("ludo-mission-updated"));
      return true;
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }

  return false;
}
