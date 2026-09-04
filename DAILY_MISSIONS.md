# Daily Missions — Current Contract

## Scope

This document defines the player-facing **Daily Missions** lifecycle. The Admin Mission manager is a separate management surface and now contains both **Daily** and **Weekly** tabs at `/dbase/missions`, plus a current/history separation for finished mission records.

## Player daily lifecycle

1. At the start of a new UTC day, the server creates/assigns enough fresh missions for the player to have 6 active missions.
2. Gameplay events are recorded server-side and update daily progress.
3. When a mission reaches its target, `completed=true` is recorded server-side.
4. A completed but unclaimed mission leaves the active count immediately and stays visible at the top with `CLAIM REWARD`.
5. Claiming is a server transaction that credits the configured coins/gems and sets `claimed=true`/`claimed_at`. The claim endpoint locks the mission row and rejects duplicate claims.
6. After claim, the mission is displayed below active missions as `CLAIMED`.
7. The next day receives a fresh set of 6 active missions. Old completed/unclaimed missions remain claimable so rewards are not silently lost.

## Ordering

Player Daily Missions are rendered in this order:

1. Completed + unclaimed
2. Active/in-progress
3. Completed + claimed

The active counter counts only category 2 and remains `/ 6`.

## Admin management

The Admin page `/dbase/missions` has two management tabs:

- **Daily** — existing daily missions are preserved and can be edited.
- **Weekly** — existing weekly missions are preserved and can be edited.

Within the Admin mission lifecycle, unfinished/current records remain in the current management view and finished records are moved to **History**. History is a UI filter over the existing server records; it does not delete or recreate mission definitions.

Daily management uses `/api/admin/missions`. Weekly management uses `/api/admin/missions/weekly`. Editing must persist to the server-backed mission configuration and must not replace the existing catalogue with an empty/default list.

Admin mission editors support the mission type `purchase_shop`. For that type, `app/dbase/VisualSelectors.tsx`/`ShopItemSelector` loads the existing `/api/shop/catalog` catalogue and stores the selected target as `type:id` in `shop_item`.

Admin mission editors also store board, dice, yard and yard-artwork (`background`/`sticker`) configuration. These selectors are configuration data; do not claim that they alter `/game-online` gameplay until a game-session handoff explicitly applies them.

The player-facing Daily contract remains independent of the Admin editing UI: Admin changes configure the mission catalogue, while player completion and reward claims remain server-authoritative.

## API

`GET /api/missions` returns `missions`, `activeCount`, current-day `progress`, and the daily bonus state.

`POST /api/missions` actions:

- `event`: records a verified mission event with an idempotent `eventId`.
- `claim`: requires a completed/unclaimed mission and can receive `missionDay` so older unclaimed rewards can be claimed safely.
- `claim_bonus`: claims the current day's all-six bonus once.

## Server authority

Mission completion, claim eligibility, wallet crediting, and duplicate protection are server-authoritative. The browser never awards coins/gems itself.

## Important implementation rule

Do not use `missions.slice(0, 6)` for the player Daily tab. That hides completed-unclaimed missions and incorrectly treats them as part of the six active slots. Use the API's `activeCount` and render the three lifecycle groups in the documented order.

## Regression rules

- Do not delete the existing mission catalogue when adding/editing Admin missions.
- Do not make weekly missions depend on the daily mission list.
- Do not credit rewards from React/client state.
- Do not allow duplicate claims.
- Do not turn Admin editing into a second source of truth.
- Do not treat `purchase_shop` configuration storage as proof that purchase-event progress tracking has been wired unless the purchase path explicitly updates mission progress.

## Documentation rule

Any future change to mission lifecycle, assignment count, rewards, claim behavior, Admin Daily/Weekly management, history filtering, purchase-shop missions, or visual configuration must update this document, the weekly mission documentation if present, `ARCHITECTURE.md`, and `DEVELOPER_HANDOFF.md` in the same change.

**Last reconciled:** 2026-09-04
