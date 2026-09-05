# Ludo Live — Current Project State

**Last reviewed:** 2026-09-05  
**Repository:** `MrDan001/ludo-live`  
**Production backend:** Railway  
**Production branch:** `main`  
**Web application:** Next.js with Vercel deployment integration

This is the current-state ledger. Current code is authoritative; old dated snapshots and superseded feature notes are not.

## 1. Protected multiplayer surface

`/game-online` is locked and must not be modified casually.

Canonical implementation:

- `app/game-online/OnlineMultiplayerGame.tsx`
- `app/game-online/page.tsx`
- `app/_components/LudoBoardMultiplayer.tsx`
- multiplayer authority modules under `lib/`

The completed multiplayer implementation is treated as a protected contract. Future work must not touch it unless the request explicitly reopens that surface.

## 2. Bot vs Human and Tournament turn sequencing

The local Human-vs-Bot flow is `/game` and the Tournament Bot-vs-Human flow is `/tournament/game` using their dedicated game components.

The current turn contract is:

**Human roll animation → result is committed → if no legal move, the complete roll animation finishes before the turn changes → Bot preparation → Bot roll animation → Bot result → Bot move.**

The Tournament implementation is `app/game/TournamentBotGame.tsx`; the Bot-vs-Human implementation is `app/game/GameBoardContent.tsx`.

## 3. Admin Missions

`/dbase/missions` contains Daily and Weekly management tabs. Existing mission records are preserved and edited through server-backed Admin APIs.

## 4. Admin Shop and catalogue

`/dbase/shop` is the canonical catalogue-management surface for boards, dice, avatars and related shop items. Do not create parallel catalogue sources without an explicit product requirement.

Supported purchase currencies remain `coins`, `gems` and `naira`.

## 5. Admin Events

Admin Events remains server-authoritative. Event compatibility fields must stay synchronized with the current event model.

## 6. Tournament funding

Tournament funding continues to use the Admin Finance virtual treasury. Prize/entry funding must be validated against the same authoritative treasury shown by Admin Finance.

## 7. Wallet and accounting

Wallet changes are server-authoritative and transactional. Wallet audit records should preserve source, reason, transaction/request metadata, actor/player identity where available, balances before/after, IP and user agent.

Do not manufacture currency or treat client-side payment success as authoritative.

## 8. Spin Wheel — rebuilt 2026-09-05

Spin Wheel has been rebuilt from scratch around a fixed **8-slot** server configuration.

Player surface:

- `/spin`

Admin surface:

- `/dbase/spin`

Authoritative configuration table:

- `ludo_spin_wheel_slots`

Canonical configuration contract:

- exactly 8 slots (`0` through `7` internally; displayed as Slots 1–8);
- every slot is always active;
- every slot has an editable label, icon, reward type, amount and probability/weight;
- supported reward types are Coins, Gems, Extra Spin and Shop Item;
- Shop Item slots must reference an item that exists in the live Shop catalogue;
- total weight must remain positive;
- the server selects the winning slot and applies the reward transactionally.

The old `ludo_spin_rewards` configuration table is retired. The new eight-slot table is the only Spin Wheel configuration source.

### Spin result synchronization

A spin response returns the exact eight-slot wheel snapshot, its configuration version, the selected slot index and the exact prize object. The player wheel animates against that returned snapshot, so the visual landing position and the rewarded item cannot drift apart because of a concurrent Admin edit.

An Admin change affects the live configuration for subsequent spins. A spin already in progress finishes against the snapshot returned by the server for that spin.

### Spin balances and reward history

Active-play spin earning continues through `/api/spin/activity` and `ludo_spin_state`. Shop-item wins continue through the existing Spin Rewards claim flow under `/spin-rewards` and `ludo_spin_item_rewards`.

## 9. Admin browser-dialog UX

Use the project's branded modal/toast patterns instead of native `alert`, `confirm` or `prompt` for product UI.

## 10. Authentication and Admin access

Protected Admin surfaces remain under `/dbase`. Admin APIs verify the active Ludo session and configured Admin email allow-list.

## 11. Notifications and active-time rewards

Browser notification permission is not itself proof of subscription/registration. Active-play heartbeat and progression rewards remain server-authoritative.

## 12. Deployment discipline

For every production code change:

1. Inspect the exact affected implementation before editing.
2. Rebuild the affected feature rather than stacking speculative patches when the request calls for a rebuild.
3. Keep changes scoped to the requested feature.
4. Wait for Railway/Vercel deployment status before calling the release successful.
5. Verify the actual production behavior for critical workflows.

## 13. Documentation source of truth

- `CURRENT_PROJECT_STATE.md` — current implementation ledger
- `ARCHITECTURE.md` — technical architecture contract
- `DEVELOPER_HANDOFF.md` — safe production-change rules
- focused feature documents — current contracts for protected subsystems

Dated developer snapshots and superseded implementation notes should not be used as current-state references.
