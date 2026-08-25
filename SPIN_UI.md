# Spin Wheel UI

## Server time

The Spin Wheel displays the authoritative time returned by `/api/spin` and renders it as **GMT +1**. The active-play bonus is presented as `17:00–20:00 server time (GMT +1)` rather than naming a country or local timezone.

The API response includes `serverTime` so the client does not have to guess the server clock. The client advances that timestamp locally between refreshes.

## Available spins placement

The available-spin indicator is intentionally rendered **below the Spin Now button**. It must not be placed above the wheel/button as a primary status control.

## Active-play rewards

The server-authoritative activity endpoint is `/api/spin/activity`.

- Eligible game-session surfaces are `/room`, `/game`, `/game-online`, and `/tournament/game` (including their nested routes).
- Every completed 30 minutes of verified visible active time grants **1 free spin + 5 XP**.
- During **17:00–20:00 Africa/Lagos**, every completed 30-minute interval grants **3 free spins + 15 XP**.
- The server caps heartbeat elapsed time and stores active time in `ludo_spin_state`.
- The same accumulated active-time clock powers the player's separate hours-based hierarchy.
- Free spins persist until consumed.

The client only requests a heartbeat and displays the server's reward result. It cannot set its own spin balance, XP, active hours, hierarchy or level.

## Change discipline

If the Spin Wheel's server-time source, GMT+1 presentation, active-play window, eligible game-session surfaces, reward amounts, or available-spin placement changes, update this document and the relevant architecture/handoff MD files with the rule change.
