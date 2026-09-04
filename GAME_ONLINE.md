# Ludo Live — `/game-online` Multiplayer Developer Handoff

**Last reconciled:** 2026-09-04

This is the focused implementation map for the live multiplayer game. Read it before changing `/game-online`, Socket.IO multiplayer, multiplayer chat, voice, room-to-game handoff, movement animation, betting/stakes, or multiplayer player identity.

## 1. Entry chain

The browser route is:

`/game-online`

Current chain:

`app/game-online/page.tsx`
→ `app/game-online/OnlineMultiplayerChatRuntimeFix.tsx`
→ `app/game-online/OnlineMultiplayerGame.tsx`
→ active rebuilt multiplayer implementation.

`page.tsx` is intentionally a very small `Suspense`/`force-dynamic` entry. Do not put multiplayer state logic there.

`OnlineMultiplayerChatRuntimeFix.tsx` is an important compatibility/runtime layer. It must not be removed as “dead code” without tracing the current chat flow.

## 2. Chat wiring — important

The online game has two chat responsibilities that work together:

1. **Live Socket.IO chat** keeps real-time room messages flowing.
2. **`/api/multiplayer-chat` persistence** keeps room history available when the player enters/re-enters the game.

`OnlineMultiplayerChatRuntimeFix.tsx` patches the Socket.IO `chat` listener/emitter once using a global Symbol guard.

### On `join-room`

The runtime fix captures:

- room code
- player ID
- player name

It then loads persisted history from:

`GET /api/multiplayer-chat?roomCode=...`

The loaded messages are passed to the registered chat listeners so the chat drawer can recover previous messages.

### On outgoing `chat`

The Socket.IO chat event is still emitted normally. In parallel, the runtime layer POSTs the text to:

`POST /api/multiplayer-chat`

Text is trimmed and capped at 240 characters before persistence.

### On incoming `chat`

The runtime wrapper rejects empty messages and creates a unique UI message id using the Socket.IO connection id/message id plus a local sequence/timestamp. This prevents repeated message ids from causing React list/reconciliation problems.

**Do not replace this with a second chat transport.** The Socket.IO room remains the live transport; `/api/multiplayer-chat` is the persistence/history layer.

If a future developer sees the symptom “new chat notification appears but the message is missing,” inspect this chain first:

`Socket.IO chat listener → OnlineMultiplayerChatRuntimeFix → MultiplayerChatOverlay/communication UI → /api/multiplayer-chat persistence/history`.

Do not immediately rewrite the room/socket system.

## 3. Online game page and stake display

`OnlineMultiplayerChatRuntimeFix.tsx` also renders `StakeDisplay`.

It reads the `room` query parameter and polls:

`GET /api/multiplayer-stake?roomCode=...`

The display is shown only when the returned pot is greater than zero. It reports the authoritative state as:

- `STAKED`
- `LOCKED`
- `SETTLED`

The displayed pot comes from the server. The online game client must never calculate the authoritative pot from browser state.

## 4. Multiplayer room lifecycle

The waiting room is `/room` and uses `app/_components/LiveSocial.tsx`.

The public lobby is `/lobby`.

The game room is handed to `/game-online` after the server starts the match.

Server responsibilities are split deliberately:

- `server.js` — room registry, lobby discovery, roster/host behavior and base Socket.IO transport.
- `multiplayer-canonical.js` — canonical multiplayer readiness/start/dice/movement/reconnect state.
- `bet-system.js` — in-room stake agreement, confirmations, atomic wallet lock and winner settlement.
- `empty-room-cleanup.js` — removes empty pre-game room registry entries.
- `lib/onlineLudoAuthority.js` — authoritative multiplayer movement/rules adapter.

Do not merge these responsibilities into a client component.

## 5. Multiplayer authority

The server is authoritative for:

- room membership
- player seats
- readiness
- turns
- dice result
- legal movement
- captures
- win state
- stake locking
- stake settlement

The client is responsible for presentation, input and animation. A client-supplied destination is never authoritative.

`lib/onlineLudoAuthority.js` delegates the actual movement calculation to canonical `lib/ludoRules` behavior. Do not create another multiplayer rules engine.

## 6. Movement events and animation

The authoritative server state is delivered through `game-state`.

Movement presentation is driven by `game-moved` metadata including:

- `tokenId`
- `from`
- `to`
- `finalTo`
- `captureProgress`
- `captured`
- `captureToCenter`
- `stateRevision`

The rebuilt client maintains separate authoritative and display token state.

A `game-state` update must not instantly overwrite a token while its movement animation is active. Movement events are queued and displayed progressively at roughly 280 ms per traversed progress step. After the queue is empty, the display is reconciled to the newest authoritative snapshot.

`stateRevision` protects against stale updates.

## 7. Capture/kill behavior

The canonical multiplayer presentation must preserve the current capture sequence rather than snapping to final state.

The authoritative movement result tells the client whether a capture occurred and supplies `captureProgress`/`finalTo` information.

The client presents:

1. killer moving toward the victim square;
2. victim returning to yard;
3. killer reaching the authoritative final destination;
4. display reconciliation with authoritative `game-state`.

Do not reimplement capture detection in React.

## 8. Board/progress rules

Use the canonical board geometry and progress mapping.

- `0` = yard/home.
- `1..51` = shared track.
- `52..57` = color home/finish lane.
- canonical `FINISH` = final finish destination.

Do not create a second physical board coordinate system for multiplayer.

Only legal tokens are made selectable/pulsing after a roll. UI legality may use canonical `canMove()`, but the server validates the move again.

## 9. Seats and colors

Use `playerColorsForSeats()`.

- 2 players: seat 0 = Red + Yellow; seat 1 = Green + Blue.
- 4 players: one canonical color per seat.
- players can move only their assigned colors.
- teammates cannot capture teammates.

## 10. Player identity and avatar

Multiplayer identity is server/profile-backed.

Waiting-room player names and avatars use the canonical Player Showcase/profile data. `LiveSocial.tsx` must merge roster/game-state updates by stable player identity so cosmetic fields omitted by later state updates do not erase an already-resolved avatar.

The board/theme is room/host authoritative; a joining player's personal board skin must not replace the host room board.

## 11. Voice

`app/_components/ChatVoice.tsx` is the single canonical room voice implementation.

Voice uses PeerJS/WebRTC and browser microphone permission. Socket.IO is not the audio transport.

Do not create another room-specific voice implementation. A remote call can arrive before the local microphone is enabled, so the existing pending-call lifecycle must be preserved.

## 12. Betting/stakes

Stake selection is intentionally not part of Create Game or Join Game.

The room lifecycle is:

`create/join → negotiate through room chat/voice → host sets agreed stake → all players confirm → all Ready → atomic wallet lock → game → authoritative winner → settlement`

The betting layer is game-currency only. It does not use Paystack.

Client UI may display stake status, but the server owns the amount, wallet deduction and settlement.

## 13. Session/reconnect

`MULTIPLAYER_SESSION.md` is the canonical reconnect contract.

`ludo-room` localStorage is only a convenience cache. It is not proof that a player remains in the room.

Explicit leave and unexpected disconnect are separate paths. Do not add duplicate Socket.IO disconnect handlers.

A temporary disconnect may preserve the server-side session for the reconnect window. Rejoining with the same authenticated player identity must restore the existing match state rather than creating a second match.

## 14. Protected references

Never repair multiplayer by casually changing the protected gameplay references:

- `/game` / `app/game/GameBoardContent.tsx`
- `/tournament/game` / `app/game/TournamentBotGame.tsx`
- canonical `lib/ludoRules*` and `lib/ludoEngine.ts`

If multiplayer needs a behavior already present there, port the required behavior into the multiplayer path without changing the protected reference unless the product requirement explicitly changes it.

## 15. Known legacy boundary

`lib/multiplayerMove.js` exists as a legacy adapter. Do not delete it blindly. Trace imports from the current `main` tree first.

## 16. Current Admin visual configuration boundary

Admin Event, Mission and Tournament editors now store/select:

- board
- dice
- yard
- yard artwork: Background or Backgroundless

The shared selector is `app/dbase/VisualSelectors.tsx` and reads the existing `/api/shop/catalog` catalogue. Admin Mission also supports selecting a shop item for the `purchase_shop` mission type.

The current admin APIs persist these values and `/api/events` exposes event visual configuration. **Do not document or assume that selecting these values automatically applies them to an active `/game-online` match until the game-session handoff explicitly wires them into the multiplayer room/game payload.** Configuration storage and gameplay application are separate concerns.

## 17. Testing checklist

### Chat

- [ ] Player A sends a message; Player B receives it live.
- [ ] Player B replies; Player A receives it live.
- [ ] Reopening/rejoining the room loads persisted history.
- [ ] A later `game-state` update does not erase chat/avatar state.
- [ ] Empty messages are ignored.

### Multiplayer game

- [ ] 2-player and 4-player seat/color ownership is correct.
- [ ] Ready/turn state is synchronized.
- [ ] Only legal tokens pulse.
- [ ] Normal movement is visible cell-by-cell.
- [ ] Yard entry is visible.
- [ ] Home-lane traversal is visible.
- [ ] Capture sequence is visible and authoritative.
- [ ] Stale state revisions do not overwrite newer state.
- [ ] Both clients converge on the same final state.
- [ ] Voice still works.
- [ ] Stake display reflects server state.

## 18. Change discipline

Before changing online multiplayer:

1. Trace the current route and Socket.IO event path.
2. Read `MULTIPLAYER_ARCHITECTURE.md`, `MULTIPLAYER_LOBBY.md`, `MULTIPLAYER_SESSION.md`, and this document.
3. Preserve server authority.
4. Do not duplicate chat, voice, movement rules, board geometry or betting logic.
5. Build the affected code.
6. Inspect Railway build/runtime logs.
7. Do not call the release live until Railway reports `SUCCESS`.
8. Update this document and the central developer documentation when the contract changes.
