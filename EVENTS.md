# Ludo Live — Event System

## Purpose

The Event system is server-authoritative and connects Admin-created events to player gameplay progress, missions/objectives, expiry, and one-time reward settlement.

## Player lifecycle

The player Event page intentionally shows only two tabs:

- **Live Events** — events whose admin-defined `startsAt` has arrived and whose `endsAt` has not passed.
- **Upcoming** — published events whose admin-defined `startsAt` is still in the future.

Expired/ended events are not shown to players. Event records remain in PostgreSQL for Admin review, settlement, and audit/history.

## Admin lifecycle

Admin is the source of event configuration. Admin can create/publish/schedule events and define:

- title/description/icon
- reward coins/gems
- mission kind and target
- supported game modes
- supported boards/moods
- start date/time
- end date/time
- board, dice, yard and yard-artwork configuration

The Admin Events page `/dbase/events` separates **current/active** event records from **History**. Ended records belong in History; published/upcoming/live records remain in the current area. This is an Admin UI presentation boundary only; records are not deleted when they end.

The shared Admin visual selectors are sourced from `/api/shop/catalog` through `app/dbase/VisualSelectors.tsx`. Stored visual configuration is `boardId`, `diceId`, `yardId`, and `yardKind` (`background` or `sticker`). The current Event API exposes these values. Storing them does not by itself mean `/game-online` applies them; the game-session handoff must explicitly carry/apply them before that can be claimed as implemented.

The server determines event state from the stored timestamps. Client countdowns are presentation only.

Conceptual lifecycle:

`draft -> published/upcoming -> live -> ended/settled`

Cancelled events are also retained server-side.

### Admin schema compatibility

`ludo_events.name` is a required database column. The Admin event creation/edit path must keep the compatibility field synchronized with the configured title:

- create: `name = title`
- edit: `name = title`

Event seed definitions must also provide the required `name` value. An empty event table is valid; an Admin API error must not be used as the empty-state representation.

Do not add fake events, reset event rows, or bypass the database constraint as a workaround.

## Joining

Players can join only while the server evaluates the event as `live`. The `/api/events` POST `action=join` endpoint creates an idempotent `ludo_event_entries` record.

## Gameplay progress

Qualifying gameplay activity is sent through the event activity endpoint and matched against the player's joined active events by `mission_kind`.

Progress is capped at the event `mission_target`. When the target is reached:

- `progress = mission_target`
- `completed = TRUE`
- `completed_at` is recorded

Progress and completion are server-side values; the Event page only displays them.

## Expiry and reward settlement

Expired events are settled server-side. The settlement path:

1. Finds published events where `ends_at <= NOW()`.
2. Locks the event transactionally.
3. Marks the event ended.
4. Finds completed player entries.
5. Inserts one reward ledger row per `(event_id, user_id)` using a unique conflict guard.
6. Credits the user's coins/gems only when the ledger row is newly inserted.
7. Marks the entry `reward_claimed = TRUE`.
8. Records `settled_at`.

This makes reward settlement idempotent: rerunning the settlement process cannot pay the same player twice for the same event.

The production server also runs the automatic event-settler worker so expiry does not depend on a player opening the Event page. API reads/actions also call the settlement path defensively.

## Event reward data

`ludo_events` stores configured reward amounts. `ludo_event_entries` stores per-player progress/completion/reward-claimed state. `ludo_event_rewards` is the settlement ledger.

## UI progress-bar rule

The progress fill must be a block-level element with an explicit height and width. A plain inline `<span>` does not reliably render a percentage width, which caused completed events such as `1/1` to display an empty bar. The Event page now uses `progressFill` with `display: block`, `height: 100%`, and the calculated percentage width.

## Developer rules

- Do not create a second client-side event engine.
- Do not award event rewards from React/client state.
- Do not trust client timestamps for lifecycle authority.
- Do not show expired/history tabs on the player Event page unless product requirements explicitly change.
- Keep Admin as the place for full lifecycle/history review.
- Treat `name` as a required compatibility field and keep it synchronized with `title`.
- Treat Admin visual configuration as stored configuration until the gameplay handoff explicitly applies it.
- When changing Event behavior, update this document and `DEVELOPER_HANDOFF.md` in the same change.

**Last reconciled:** 2026-09-04
