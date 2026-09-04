# Ludo Live — Documentation Index & Current Contracts

**Reconciled:** 2026-09-04

This is the map for the repository Markdown documentation. `CURRENT_PROJECT_STATE.md` is the current implementation ledger; `ARCHITECTURE.md` is the technical contract; `DEVELOPER_HANDOFF.md` is the safe-change guide. `GAME_ONLINE.md` is the focused handoff for the live multiplayer page and must be read before changing `/game-online`.

## Current implemented areas

- **Admin Missions:** `/dbase/missions` has Daily and Weekly management plus current/history lifecycle separation; existing missions are preserved and editable through server-backed APIs.
- **Admin Events:** `/dbase/events` separates active/current records from ended/history records.
- **Admin Tournament:** `/dbase/tournament` separates current records from ended/history records; lifecycle is derived from stored start/end times.
- **Admin visual configuration:** Events, Missions and Tournament editors expose Board, Dice, Yard and Background/Backgroundless yard-artwork selectors sourced from the existing Shop catalogue. Mission editing also supports selecting a Shop item for `purchase_shop` missions.
- **Admin Shop:** `/dbase/shop` is the canonical catalogue management surface.
- **Admin Finance/Tournaments:** tournament funding is tied to the platform Admin Finance virtual treasury; tournament lifecycle is Upcoming → Live → Ended.
- **Wallet audit:** wallet mutations are server-authoritative and the audit system records available source/reason/request/actor and request metadata; historical unknown values are preserved rather than fabricated.
- **Multiplayer:** canonical board/rules/authority modules remain the source of truth. Capture, yard/home state, turn state, room membership and animation must be kept synchronized with authoritative state.
- **Online multiplayer chat:** live Socket.IO chat is combined with `/api/multiplayer-chat` persistence/history through `OnlineMultiplayerChatRuntimeFix.tsx`.
- **Chat/voice:** shared in-game communication components exist; voice signaling follows the active room roster/socket and player identity comes from authoritative profile data.
- **Avatar sync:** equipped profile avatars are the canonical player identity shown in multiplayer/profile surfaces.
- **Shop/Spin:** free Spin rewards are rewards, not purchases; level locks must not block a valid free reward. Naira purchases use server-verified Paystack flow.
- **Modal UX:** native browser `alert`, `confirm`, and `prompt` are not the intended product UX; use `LudoConfirmModal` and the project's branded feedback components.
- **Notifications:** browser permission is not equivalent to successful server subscription/registration.
- **Deployment:** Railway is the production backend deployment; the repository also contains Vercel web deployment integration.

## Documentation map

| Document | Role |
|---|---|
| `CURRENT_PROJECT_STATE.md` | Current-state ledger and regression rules |
| `ARCHITECTURE.md` | Technical/product architecture contract |
| `DEVELOPER_HANDOFF.md` | Production-safe engineering workflow |
| `GAME_ONLINE.md` | **Focused `/game-online` multiplayer wiring and regression handoff** |
| `ADMIN_REBUILD_SPEC.md` | Admin product/rebuild specification; verify implementation against code |
| `ADMIN_SHOP_LIVE_PRICING.md` | Admin Shop pricing contract |
| `SHOP_PRICING.md` | Player/Admin Shop pricing rules |
| `DAILY_MISSIONS.md` | Daily mission lifecycle and claim contract |
| `EVENTS.md` | Event lifecycle, progress, settlement and Admin history boundary |
| `LEVEL_REWARDS.md` | Level reward and progression contract |
| `LEVEL_PROGRESSION_SCALABILITY.md` | Scalable level progression rules |
| `MULTIPLAYER_ARCHITECTURE.md` | Multiplayer authority and rendering architecture |
| `MULTIPLAYER_LOBBY.md` | Waiting-room/lobby behavior |
| `MULTIPLAYER_SESSION.md` | Multiplayer session persistence/resume |
| `AVATAR_ARCHITECTURE.md` | Avatar identity and customization architecture |
| `docs/AVATAR_CATALOGUE.md` | Avatar catalogue rules |
| `YARD_SKINS.md` | Yard skin behavior |
| `docs/YARD_COSMETICS.md` | Yard cosmetic implementation contract |
| `SPIN_UI.md` | Spin UI/reward presentation |
| `SUPPORT.md` | Player/Admin support contract |
| `NOTIFICATIONS.md` | Notification implementation contract |
| `NOTIFICATION_INCIDENT.md` | Historical notification incident and regression lessons |
| `PLAYER_HIERARCHY.md` | Verified active-time hierarchy |
| `PLAYER_SHOWCASE_REPUTATION.md` | Public player showcase/reputation rules |
| `PRESTIGE_SYSTEM.md` | Prestige calculation |
| `ROOM_REFRESH.md` | Room refresh/persistence behavior |
| `RAILWAY_TRIGGER.md` | Railway deployment trigger notes |
| `DEVELOPER_STATE_2026-09-02.md` | Historical developer-state snapshot |
| `DEVELOPER_STATE_2026-09-04.md` | Current 2026-09-04 developer-state snapshot |

## Status vocabulary

- **Implemented/current:** verified in the repository or explicitly reconciled with the current implementation.
- **Contract/specification:** required design/product behavior that must still be verified against code before claiming it is live.
- **Historical:** incident or snapshot documentation retained for context; it is not automatically a statement of current behavior.
- **Planned:** intentionally not represented as implemented.

## Rules for future documentation changes

1. Do not silently delete historical design intent that explains an important safeguard.
2. Correct obsolete implementation claims when the code changes.
3. Never describe a specification as proof that a feature is implemented.
4. For a production behavior change, update `CURRENT_PROJECT_STATE.md`, `ARCHITECTURE.md`, `DEVELOPER_HANDOFF.md`, and the relevant focused document.
5. For `/game-online` changes, update `GAME_ONLINE.md` and `MULTIPLAYER_ARCHITECTURE.md` together.
6. Preserve server-authoritative financial, reward, progression, tournament and customization rules in documentation.
7. Record unresolved defects as unresolved rather than documenting a guessed fix.

## Important current boundaries

- Player Event UI intentionally has no history/expired tab; ended records remain server-side for Admin review/settlement.
- Admin Events, Missions and Tournament now separate current work from finished/history in their management UI.
- Admin visual selectors are configuration storage; do not claim they automatically alter `/game-online` until the game-session handoff carries/applies those values.
- Live multiplayer chat uses Socket.IO for real-time delivery and `/api/multiplayer-chat` for persistence/history.
- `OnlineMultiplayerChatRuntimeFix.tsx` is an active compatibility layer, not disposable dead code.
- Never repair multiplayer by modifying the protected Bot-vs-Human or Tournament reference implementations unless the product requirement explicitly changes those modes.
