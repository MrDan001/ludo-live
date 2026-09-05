# Ludo Live — Documentation Index & Current Contracts

**Reconciled:** 2026-09-05

This file maps the active repository documentation. `CURRENT_PROJECT_STATE.md` is the current implementation ledger; `ARCHITECTURE.md` is the technical contract; `DEVELOPER_HANDOFF.md` is the safe-change guide. `GAME_ONLINE.md` is the focused handoff for `/game-online` and must be read before that protected surface is changed.

## Current implemented areas

- **Bot vs Human:** `/game` uses the canonical local board/game flow.
- **Tournament:** `/tournament/game` uses the dedicated Tournament Bot-vs-Human board and its restored state.
- **Turn sequencing:** local human-to-bot turns now keep the human roll animation complete before a no-legal-move turn is handed to the bot.
- **Admin Missions:** `/dbase/missions` has Daily and Weekly management with server-backed persistence.
- **Admin Events:** `/dbase/events` is server-authoritative and keeps event lifecycle/history boundaries.
- **Admin Tournament/Finance:** tournament lifecycle and funding remain tied to the Admin Finance treasury.
- **Admin Shop:** `/dbase/shop` is the canonical catalogue-management surface.
- **Wallet audit:** wallet mutations remain server-authoritative and auditable.
- **Protected online multiplayer:** `/game-online` is locked and must not be modified unless the user explicitly requests work on that surface.
- **Spin Wheel:** `/spin` and `/dbase/spin` now use a rebuilt fixed eight-slot configuration. The player animation and payout use the same server-returned wheel snapshot, preventing configuration/payout drift.
- **Active-time spins:** `/api/spin/activity` continues to award the server-side free-spin balance from verified active gameplay time.
- **Spin Rewards:** `/spin-rewards` continues to provide the claim/history flow for Shop-item Spin prizes.
- **Modal UX:** native browser dialogs are not the intended product UX.
- **Notifications:** browser permission is not proof of server registration.
- **Deployment:** Railway is the production backend deployment and Vercel integration remains in the repository.

## Documentation map

| Document | Role |
|---|---|
| `CURRENT_PROJECT_STATE.md` | Current-state ledger and regression rules |
| `ARCHITECTURE.md` | Technical/product architecture contract |
| `DEVELOPER_HANDOFF.md` | Production-safe engineering workflow |
| `GAME_ONLINE.md` | **Focused `/game-online` multiplayer wiring and protected-surface handoff** |
| `MULTIPLAYER_ARCHITECTURE.md` | Multiplayer authority and rendering architecture |
| `MULTIPLAYER_LOBBY.md` | Waiting-room/lobby behavior |
| `MULTIPLAYER_SESSION.md` | Multiplayer session persistence/resume |
| `SPIN_WHEEL.md` | **Current fixed 8-slot Spin Wheel contract and admin synchronization** |
| `ADMIN_REBUILD_SPEC.md` | Admin product/rebuild specification; verify against code |
| `ADMIN_SHOP_LIVE_PRICING.md` | Admin Shop pricing contract |
| `SHOP_PRICING.md` | Player/Admin Shop pricing rules |
| `DAILY_MISSIONS.md` | Daily mission lifecycle and claim contract |
| `EVENTS.md` | Event lifecycle, progress, settlement and Admin history boundary |
| `LEVEL_REWARDS.md` | Level reward and progression contract |
| `LEVEL_PROGRESSION_SCALABILITY.md` | Scalable level progression rules |
| `AVATAR_ARCHITECTURE.md` | Avatar identity/customization architecture |
| `docs/AVATAR_CATALOGUE.md` | Avatar catalogue rules |
| `YARD_SKINS.md` | Yard skin behavior |
| `docs/YARD_COSMETICS.md` | Yard cosmetic implementation contract |
| `SUPPORT.md` | Player/Admin support contract |
| `NOTIFICATIONS.md` | Notification implementation contract |
| `NOTIFICATION_INCIDENT.md` | Historical notification incident and regression lessons |
| `PLAYER_HIERARCHY.md` | Verified active-time hierarchy |
| `PLAYER_SHOWCASE_REPUTATION.md` | Public player showcase/reputation rules |
| `PRESTIGE_SYSTEM.md` | Prestige calculation |
| `ROOM_REFRESH.md` | Room refresh/persistence behavior |

## Status vocabulary

- **Implemented/current:** verified in the repository or explicitly reconciled with current code.
- **Contract/specification:** required design/product behavior that must still be verified against code before claiming it is live.
- **Historical:** incident documentation retained for context; it is not automatically a current implementation claim.
- **Planned:** intentionally not represented as implemented.

## Documentation rules

1. Current implementation claims must match repository code.
2. Rebuild requests must result in a clean replacement of the affected implementation, not a chain of speculative patches.
3. Feature documentation must identify the actual source of truth and API path.
4. `/game-online` is a protected surface; do not silently modify it while working on another feature.
5. Financial, reward, progression, tournament and customization outcomes remain server-authoritative.
6. When a feature changes, update the current ledger, architecture contract and its focused document.
7. Dated developer-state snapshots are removed when they are superseded; do not use old snapshots as current-state authority.

## Important current boundaries

- Player Event UI intentionally has no history/expired tab; ended records remain server-side for Admin review/settlement.
- Admin visual selectors are configuration storage and should not be described as automatically affecting unrelated game surfaces without an explicit state handoff.
- Live multiplayer chat uses its existing real-time/persistence architecture and is separate from the protected Spin Wheel rebuild.
- Never repair multiplayer by modifying the protected Bot-vs-Human or Tournament reference implementations unless the product requirement explicitly changes those modes.
