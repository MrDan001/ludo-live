# Daily Missions — Current Contract

## Purpose

The player has **6 active daily missions**. Active count is based only on missions that are not completed and not claimed.

## Lifecycle

1. At the start of a new UTC day, the server creates/assigns enough fresh missions for the player to have 6 active missions.
2. Gameplay events are recorded server-side and update daily progress.
3. When a mission reaches its target, `completed=true` is recorded server-side.
4. A completed but unclaimed mission leaves the active count immediately and stays visible at the **top** of the Missions page with `CLAIM REWARD`.
5. Claiming is a server transaction that credits the configured coins/gems and sets `claimed=true`/`claimed_at`. The claim endpoint locks the mission row and rejects duplicate claims.
6. After claim, the mission is displayed below active missions as `CLAIMED`.
7. The next day always gets a fresh set of 6 active missions. Old completed/unclaimed missions remain visible until claimed so rewards are not silently lost.

## Ordering

Player Daily Missions are rendered in this order:

1. Completed + unclaimed (waiting for reward claim)
2. Active/in-progress missions
3. Completed + claimed missions

The active counter counts only category 2 and remains `/ 6`.

## API

`GET /api/missions` returns `missions`, `activeCount`, current-day `progress`, and the daily bonus state.

`POST /api/missions` actions:

- `event`: records a verified mission event with an idempotent `eventId`.
- `claim`: requires a completed/unclaimed mission and optionally receives `missionDay` so old unclaimed rewards can be claimed safely.
- `claim_bonus`: claims the current day's all-six bonus once.

## Server authority

Mission completion, claim eligibility, wallet crediting, and duplicate protection are server-authoritative. The browser never awards coins/gems itself.

## Important implementation rule

Do not use `missions.slice(0, 6)` for the player Daily tab. That would hide completed-unclaimed missions and would incorrectly treat them as part of the six active slots. Use the API's `activeCount` and render the three lifecycle groups in the documented order.

## Documentation rule

Any future change to mission lifecycle, assignment count, rewards, or claim behavior must update this document and `DEVELOPER_HANDOFF.md` in the same change.
