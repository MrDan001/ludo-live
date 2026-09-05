# Ludo Live — Architecture & Product Contract

**Reconciled:** 2026-09-05

This document is the current technical/product architecture. Repository code and PostgreSQL state are authoritative. Do not infer current behavior from screenshots, old branches, dated snapshots or conversation history.

## Runtime and authority

- Next.js / React / TypeScript application.
- PostgreSQL through `pg` is the persistent source of truth.
- Socket.IO in `server.js` owns live multiplayer room state.
- `main` is the production branch connected to Railway.
- A release is not considered live until Railway reports `SUCCESS`.
- Authenticated APIs derive identity from the `ludo_session` cookie.
- `localStorage` is UX restoration only; it is not authoritative for account, wallet, reward, progression, tournament, event or customization outcomes.

## Canonical Ludo gameplay

The canonical board/rules layer is shared by local and multiplayer gameplay:

- `app/_components/LudoBoard.tsx`
- `app/_components/CanonicalLudoBoard.tsx`
- `app/_components/LudoBoardMultiplayer.tsx`
- `lib/ludoRules.ts`
- `lib/ludoEngine.ts`
- `lib/canonicalLudoBoard.ts`

Human team is Red + Yellow. Bot team is Green + Blue. Teammates cannot capture one another.

Do not create a second board geometry or parallel rules engine.

The custom capture rule remains: a successful kill sends the killer directly to finish position `57`, while the killed token returns to yard position `0`. The finish sound is emitted when position `57` is reached, not for every home-lane step.

## Protected `/game-online`

`/game-online` is currently locked.

Protected implementation includes:

- `app/game-online/OnlineMultiplayerGame.tsx`
- `app/game-online/page.tsx`
- multiplayer board/authority components used by that route.

Do not modify this surface while working on another feature. Reopen it only when the user explicitly requests a change to `/game-online`.

## Local Bot-vs-Human and Tournament sequencing

The local Bot-vs-Human surface is `/game` and the Tournament Bot-vs-Human surface is `/tournament/game`.

The no-legal-move handoff follows one visual sequence:

**Human roll starts → human roll animation completes → result is committed → turn changes → bot prepares → bot roll animation runs → bot result appears → bot makes its move.**

A legal human roll continues into token selection and movement before the bot turn begins.

The affected implementations are:

- `app/game/GameBoardContent.tsx`
- `app/game/TournamentBotGame.tsx`
- `app/_components/DemoDice.tsx`

## Dice and audio

`DemoDice` owns the player roll interaction. `LudoDice` owns dice-skin rendering. `LudoAudio` is the canonical audio layer.

Supported events are `dice`, `move`, `capture`, `safe`, `home` and `win`.

One player `dice` event is emitted at player roll start. Bot paths emit their own roll-start event because bots do not click the player dice.

## Authentication, profile and customization

- `app/api/auth/route.ts` handles account/session operations.
- `lib/auth-session.ts` provides server session lookup.
- `app/api/customization/route.ts` is authoritative for owned/equipped board, dice, avatar and item state.
- Player identity should come from the authoritative profile and catalogue data rather than hard-coded placeholder identities.

## Multiplayer architecture

`server.js` and the multiplayer authority modules own live room state, turn state, legal movement, match outcomes and room membership.

The online multiplayer room uses the existing chat/voice/social components and the canonical profile/customization identity.

The host owns the room board/theme. A joining player's personal board/theme must not replace the host's authoritative room board.

## Tournament architecture

- `/tournament` — tournament management/player view.
- `/tournament/game` — Tournament gameplay shell.
- `app/game/TournamentBotGame.tsx` — Tournament Bot-vs-Human board/game.
- `/api/tournaments` and `/api/tournaments/board-state` — tournament state, persistence, win recording and restore.

Tournament funding remains tied to the Admin Finance virtual treasury. Tournament outcomes and points are server-authoritative.

## XP, levels and active-time rewards

Progression is server-backed and duplicate-safe.

Active-time earning is separate from Spin Wheel configuration:

- `app/_components/ActiveSpinRewards.tsx`
- `POST /api/spin/activity`
- `ludo_spin_state`

Eligible active gameplay surfaces are `/room`, `/game`, `/game-online` and `/tournament/game`, while the document is visible.

The current `/api/spin/activity` implementation uses 30-minute intervals and the `Africa/Lagos` Rush Hour window from 17:00 to 20:00. Its response is authoritative for the exact spin/XP grant values. Unused earned spins persist until consumed.

## Spin Wheel architecture — rebuilt 2026-09-05

### Surfaces

Player wheel:

- `/spin`

Admin configuration:

- `/dbase/spin`

Spin-item claim/history:

- `/spin-rewards`

API:

- `GET /api/spin`
- `POST /api/spin`
- `GET /api/admin/spin`
- `POST /api/admin/spin`
- `/api/spin/rewards`

### Fixed eight-slot configuration

The Spin Wheel is exactly eight slots.

PostgreSQL table:

- `ludo_spin_wheel_slots`

Slots are `0–7` internally and displayed as Slots 1–8.

The canonical default configuration is defined in `lib/spinWheel.ts`. It contains eight rewards and their initial weights. Those defaults seed only missing slots; Admin edits are persistent.

The old configurable table `ludo_spin_rewards` is retired. The rebuilt Spin APIs actively remove that legacy configuration table and never read from it.

### Admin contract

Admin may edit an existing slot, but may not add a ninth slot, delete a slot or disable a slot.

Each slot supports:

- Coins
- Gems
- Extra Spin
- Shop Item

and has an editable display label, icon, amount and probability/weight.

A Shop Item must exist in the current canonical Shop catalogue before an Admin save is accepted.

### Selection and payout

`POST /api/spin` reads one complete eight-slot database snapshot and chooses one winning slot by its configured positive weights.

The server locks the user's free-spin state, verifies a spin is available, consumes one spin and applies the selected reward transactionally.

Reward settlement:

- Coins/Gems → existing wallet-audit mutation path.
- Extra Spin → increases `ludo_spin_state.spins` by the configured amount.
- Shop Item → creates a pending record in `ludo_spin_item_rewards` for the existing `/spin-rewards` claim flow.

The client never selects the reward and never directly awards wallet/inventory state.

### Board/reward synchronization

Every successful spin response contains the exact configuration snapshot used for the decision, a configuration version, the winning slot index, the exact prize and the resulting spin balance.

`/spin` animates against that same returned snapshot and winning slot index. It does not perform an independent reward lookup to decide where to land.

Therefore an Admin change during an in-progress animation cannot make the pointer visually land on a different reward from the reward already selected and settled by the server.

After the animation completes, the player reloads the current wheel configuration so subsequent spins use the latest Admin settings.

### Authentication

Spin Wheel is an authenticated registered-player feature. Guests and unauthenticated requests are rejected because Shop Item prizes require a registered account/inventory destination.

## Shop and pricing

`/dbase/shop` is the canonical catalogue-management surface.

Supported purchase currencies are Coins, Gems and Naira. Naira purchase success is established by the verified server payment flow rather than client claims.

Free Spin rewards are rewards, not purchases, and are not blocked by Shop purchase-level locks.

## Missions

`/dbase/missions` has Daily and Weekly management and preserves existing mission records. Claims remain server-authoritative and idempotent.

## Events

Events are server-authoritative and use PostgreSQL-backed schedules, entries and settled reward ledgers. Player Event UI separates Live Events and Upcoming; history remains an Admin concern.

## Wallet audit

Wallet mutations must remain transactional and auditable. Preserve source, reason, request/transaction identifiers, actor/player identity where available, before/after balances, IP and user agent.

Do not fabricate missing historical metadata or balances.

## Admin and UX boundaries

Protected Admin routes are under `/dbase`. Admin APIs use authenticated server sessions plus the configured Admin allow-list.

Native `alert`, `confirm` and `prompt` are not the intended product UX. Use the project's branded modal/toast patterns.

## Documentation and rebuild discipline

When production behavior changes:

1. Trace the current implementation and identify the authoritative source.
2. Make the requested feature change without touching protected unrelated surfaces.
3. For a requested full rebuild, replace the affected implementation cleanly rather than layering speculative patches.
4. Reconcile `CURRENT_PROJECT_STATE.md`, `ARCHITECTURE.md`, `DEVELOPER_HANDOFF.md` and the relevant focused feature document.
5. Build and inspect the affected deployment.
6. Do not call the release live until Railway reports `SUCCESS`.

Dated state snapshots are historical and should be removed when superseded. Current documentation is not a substitute for code verification.
