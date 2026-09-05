# Ludo Live — Developer Handoff

**Reconciled:** 2026-09-05

Read `ARCHITECTURE.md` and `CURRENT_PROJECT_STATE.md` before production changes. Trace the current implementation first; do not infer behavior from screenshots or superseded snapshots.

## Non-negotiable engineering rules

1. Identify the actual source of truth before editing.
2. Keep financial, reward, ownership, tournament and progression mutations server-authoritative.
3. Reuse canonical rules/components instead of creating parallel implementations.
4. When the request says **full rebuild**, replace the affected implementation cleanly instead of stacking speculative patches.
5. Keep the change strictly scoped to the requested feature.
6. Build and inspect the affected deployment after code changes.
7. Do not call a deployment live until Railway reports `SUCCESS`.
8. Fix the exact reported build/runtime error before touching another subsystem.

## Protected surfaces

### `/game-online` — locked

`app/game-online/OnlineMultiplayerGame.tsx` is currently locked because the online multiplayer page is considered correct.

Do not modify `/game-online`, its styles, or its protected implementation while working on another feature. Reopen it only when the user explicitly asks for a change there.

The multiplayer architecture remains server-authoritative for room state, turns, legal movement, cosmetics and match outcomes.

### Local Bot vs Human / Tournament

The known local gameplay references are:

- `/game` → `app/game/GameBoardContent.tsx`
- `/tournament/game` → `app/game/TournamentBotGame.tsx`

Their current human-to-bot sequencing is:

**Human taps dice → human roll animation completes → result is committed → if there is no legal move the handoff waits for that roll animation to finish → bot prepares → bot visibly rolls → bot result is shown → bot moves.**

Do not move this sequencing back to an immediate turn switch for no-legal-move rolls.

## Canonical board/rules

Use the existing canonical Ludo engine and board geometry:

- `lib/ludoRules.ts`
- `lib/ludoEngine.ts`
- `lib/canonicalLudoBoard.ts`
- `app/_components/CanonicalLudoBoard.tsx`

Human = Red + Yellow. Bot = Green + Blue. Teammates cannot capture one another.

Do not invent a second board geometry or movement engine.

The custom kill rule remains: a successful capture sends the killer directly to finish position `57`; the killed token returns to yard position `0`. Finish sound fires only when position `57` is reached.

## Dice and audio

`app/_components/DemoDice.tsx` owns player roll interaction. `app/_components/LudoDice.tsx` owns dice skins. `app/_components/LudoAudio.tsx` is the canonical audio layer.

Supported audio events are `dice`, `move`, `capture`, `safe`, `home` and `win`.

A player roll emits one `dice` start event. Bot code emits its own roll-start event because bots do not click the player dice.

## Spin Wheel — full rebuild

Spin Wheel was rebuilt on 2026-09-05 as a fixed **8-slot** system.

### Player surface

`/spin` renders exactly eight server-configured reward segments.

The board is never generated from a separate client reward list. The server returns the exact wheel snapshot together with the selected prize and `prizeIndex` for every completed spin.

### Admin surface

`/dbase/spin` is the single Admin configuration surface.

Admin cannot add a ninth slot, delete a slot, or disable a slot. Admin edits one of the existing eight slots.

Each slot can be configured with:

- reward type: Coins, Gems, Extra Spin, or Shop Item;
- display label;
- icon;
- amount;
- probability/weight.

Shop Item rewards must reference an existing live Shop catalogue item.

### Database source of truth

The wheel configuration is stored in `ludo_spin_wheel_slots` with slots `0–7`.

The old `ludo_spin_rewards` configuration table is retired and dropped by the new Spin Wheel schema initialization.

`ludo_spin_state` remains the authoritative free-spin balance. `ludo_spin_item_rewards` remains the authoritative pending/claimed Shop-item reward history.

### Result and board synchronization

The server chooses the prize from the same eight-slot snapshot returned to the player.

The response contains:

- the full eight-slot wheel snapshot;
- a wheel configuration version;
- the winning slot index;
- the exact prize object;
- the resulting free-spin balance.

The player animation uses that returned slot index, so an Admin configuration change made during an in-progress animation cannot cause the visual pointer to land on a different reward from the one the server awarded.

After the animation completes, the player reloads the live configuration for the next spin.

### Reward settlement

Coins and Gems are credited through the existing wallet-audit path inside the same database transaction as spin consumption.

Extra Spin adds the configured number of free spins to `ludo_spin_state`.

Shop Item rewards are written to `ludo_spin_item_rewards` and remain available through `/spin-rewards` for the existing Inventory claim flow.

### Spin balance source

Active-time rewards continue through `/api/spin/activity` and `ActiveSpinRewards.tsx`.

Only game-session surfaces count active time:

- `/room`
- `/game`
- `/game-online`
- `/tournament/game`

The current server implementation grants **1 free spin + 2 XP** for each completed 30-minute interval during normal hours and **3 free spins + 6 XP** during the 17:00–20:00 `Africa/Lagos` Rush Hour window. These values are authoritative in `/api/spin/activity`.

Unused earned spins persist until consumed. The Spin Wheel consumes the server-side free-spin balance.

## Admin Shop

`/dbase/shop` is the canonical catalogue-management screen. Do not create separate catalogue systems for boards, dice, avatars or Shop items.

Naira purchases remain server-verified; client success messages are not authoritative.

## Missions

`/dbase/missions` contains Daily and Weekly management. Existing mission records must be preserved while editing the Admin UI.

Claims remain server-authoritative and idempotent.

## Events / tournaments / finance

Admin Events, Tournament and Finance are server-authoritative. Tournament funding is validated against the platform Admin Finance treasury.

Tournament lifecycle is derived from stored times: `UPCOMING → LIVE → ENDED`.

## Wallet audit

Wallet mutations must remain transactional and auditable. Preserve available source, reason, request/transaction identifiers, actor/player identity, before/after balances and request metadata.

Never fabricate balances or replace unknown historical metadata with guessed values.

## Authentication / Admin

Protected Admin routes remain under `/dbase`. Admin APIs derive the authenticated identity from `ludo_session` and the configured Admin email allow-list.

## Browser dialog UX

Do not reintroduce native `alert`, `confirm` or `prompt` for product UI. Use the project's branded modal/toast components.

## Documentation rule

After a production contract changes, reconcile:

- `CURRENT_PROJECT_STATE.md`
- `ARCHITECTURE.md`
- `DEVELOPER_HANDOFF.md`
- the relevant focused feature document

Dated developer snapshots are historical only. They are not current-state authority.
