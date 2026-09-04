# Ludo Live — Developer State — 2026-09-04

This is the current implementation handoff for the repository state as of 2026-09-04. It supplements, and where newer, supersedes the older dated developer snapshot. Read it with `CURRENT_PROJECT_STATE.md`, `ARCHITECTURE.md`, `DEVELOPER_HANDOFF.md`, and `GAME_ONLINE.md`.

## Production branch

- Repository: `MrDan001/ludo-live`
- Branch: `main`
- Backend deployment: Railway
- Web deployment integration: Vercel
- Never call a deployment live until Railway reports `SUCCESS`.

## Online multiplayer — highest-priority developer map

The active browser entry is `/game-online`.

Current route chain:

`app/game-online/page.tsx`
→ `OnlineMultiplayerChatRuntimeFix.tsx`
→ `OnlineMultiplayerGame.tsx`
→ rebuilt multiplayer client.

The route page intentionally contains only the dynamic/Suspense wrapper. `OnlineMultiplayerChatRuntimeFix.tsx` is not disposable glue: it currently provides the multiplayer chat persistence/runtime compatibility layer and the authoritative stake display.

Read `GAME_ONLINE.md` before touching this area.

## Multiplayer authority

Socket.IO/server state is authoritative for room membership, seats, readiness, turns, dice, legal moves, captures, win state and match state. `lib/onlineLudoAuthority.js` delegates movement rules to the canonical Ludo rules implementation.

Do not create a parallel movement/rules engine or trust a client-supplied destination.

## Multiplayer rendering

The client separates authoritative token state from display/animation state. `game-state` updates the authoritative snapshot. `game-moved` drives queued movement presentation. `stateRevision` prevents stale updates. Movement is displayed progressively rather than snapping immediately to the final position.

Capture/kill presentation must preserve the existing authoritative capture sequence and must not be replaced with client-only capture detection.

## Multiplayer chat

Live room chat remains Socket.IO based. Persistence/history is provided by `/api/multiplayer-chat`.

`OnlineMultiplayerChatRuntimeFix.tsx`:

- captures room/player identity when `join-room` is emitted;
- loads persisted room history after joining;
- persists outgoing `chat` text to `/api/multiplayer-chat` while still emitting the normal Socket.IO chat event;
- wraps incoming chat listeners so messages receive stable UI ids;
- prevents the chat history/runtime layer from being duplicated by a second transport.

If chat shows an unread indicator but messages do not appear, inspect this exact chain before changing the socket server or chat UI.

## Multiplayer voice

`ChatVoice.tsx` remains the single canonical room voice implementation using PeerJS/WebRTC. Do not add another voice transport.

## Multiplayer betting

Stake is agreed inside the waiting room, not on Create Game or Join Game. `bet-system.js` owns the server-side stake agreement, confirmations, atomic wallet lock and settlement. `/api/multiplayer-stake` supplies the authoritative status displayed by the online game runtime layer.

## Admin event/mission/tournament visual configuration

Admin Event, Mission and Tournament editors now expose selectors for board, dice, yard and yard artwork (Background/Backgroundless). `app/dbase/VisualSelectors.tsx` reads the existing `/api/shop/catalog` catalogue. Missions also support `purchase_shop` with a shop-item selector.

These values are persisted by the corresponding Admin APIs. Event responses expose the stored visual configuration.

Important boundary: storing the configuration is not the same as applying it to the live multiplayer game. Do not claim the `/game-online` room/game automatically uses an Admin event/mission/tournament visual selection until the game-session handoff explicitly carries and applies those fields.

## Admin lifecycle tabs

The Admin Events, Missions and Tournament surfaces now separate current items from history as requested. Finished/ended records belong in History; published/upcoming/current records remain in the active/current area. Daily/Weekly mission management remains separate from the lifecycle-history separation.

## Recent Shop purchase protection

The working Shop currency purchase path must remain server-authoritative and must preserve the wallet-audit context required by the PostgreSQL wallet trigger. Do not remove the wallet metadata/context setup from purchase mutations or replace it with client-side balance changes.

## Documentation rule

When a production contract changes, update the focused document plus `CURRENT_PROJECT_STATE.md`, `ARCHITECTURE.md`, and `DEVELOPER_HANDOFF.md` as appropriate. Never rely on a conversation transcript as the only source of truth.
