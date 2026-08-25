export type EventActivityKind = "play_games" | "win_games" | "roll_dice" | "move_tokens" | "complete_games" | "roll_sixes" | "move_home";

/** Server-backed bridge from the existing gameplay mission tracker into active events. */
export function recordEventActivity(kind: EventActivityKind, amount = 1) {
  if (typeof window === "undefined" || !kind || amount <= 0) return;
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({ action: "activity", kind, amount }),
  }).catch(() => {});
}
