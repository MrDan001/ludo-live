type MissionEventKind = "play_games"|"win_games"|"roll_dice"|"move_tokens"|"send_messages"|"join_rooms"|"create_rooms"|"roll_sixes"|"move_home"|"complete_games";

/** Fire-and-forget bridge from gameplay clients into the existing mission event ledger. */
export function recordMissionEvent(kind: MissionEventKind, amount = 1) {
  if (typeof window === "undefined" || !kind || amount <= 0) return;
  void fetch("/api/missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({ action: "event", kind, amount }),
  }).catch(() => {});
}
