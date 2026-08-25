# Ludo Live — Architecture

## Purpose

This document is the technical map of the production Ludo Live application. Read it before changing game logic, board rendering, audio, tournament persistence, multiplayer, authentication, or customization.

## Runtime

- Next.js 14 / React 18 / TypeScript 5.6.
- PostgreSQL through `pg`.
- Socket.IO for live multiplayer rooms.
- Railway is the production deployment target used by this project.
- `package.json` starts the custom Node server with `server.js`, plus the canonical/missions/forfeit rule preload files.

## Core layers

### 1. Board rendering

- `app/_components/LudoBoard.tsx` — base 15×15 board, themes, palettes, board geometry, token cell rendering.
- `app/_components/LudoBoardFixed.tsx` — framed/fixed board wrapper used by multiplayer rendering.
- `app/_components/CanonicalLudoBoard.tsx` — canonical interactive board adapter. It accepts `legalTokenKeys`, renders legal-token breathing/pulse, handles token clicks, and renders finished tokens in the centre finish area.
- `app/_components/LudoBoardMultiplayer.tsx` — multiplayer board wrapper with animated server updates and legal-token breathing.

Do not duplicate board geometry in a new game mode. Reuse the canonical board/engine unless there is a documented reason not to.

### 2. Rules / engine

- `lib/ludoRules.ts` — underlying rule implementation.
- `lib/ludoEngine.ts` — public engine adapter. It exposes dice types, team colors, movement, legal-move checks, capture application, winner detection, finish constants, and seat mapping.
- `lib/canonicalLudoBoard.ts` — canonical board geometry/state helpers and constants.

Current engine team model:

- Human team: `red` + `yellow`.
- Bot team: `green` + `blue`.

Teammates must not be treated as opponents for capture.

### 3. Dice and audio

- `app/_components/DemoDice.tsx` — dice UI, roll interaction, dice skin loading, vibration/settings, and the single player-side roll-start audio event.
- `app/_components/LudoDice.tsx` — dice skin definitions/rendering.
- `app/_components/LudoAudio.tsx` — canonical application sound listener/player. Supported events: `dice`, `move`, `capture`, `safe`, `home`, `win`.

Sound rule: a player roll emits the `dice` event at the beginning of the roll. Do not add another `dice` event when the result appears. Bot roll paths may emit their own start-of-roll event because bots do not click `DemoDice`.

### 4. Authentication/profile/customization

- `app/api/auth/route.ts` — registration, login, guest, logout, username changes, current-user response.
- `lib/auth-session.ts` — server-side session lookup from `ludo_session`.
- `app/api/auth/_db.ts` — PostgreSQL auth schema/pool.
- `app/api/customization/route.ts` — owned/equipped board, dice, avatar and item state.

The public auth user includes the profile `username` and equipped board/dice. Multiplayer player labels should use this profile name, not generic Player 1/Player 2 labels when the profile is available.

### 5. Online multiplayer

- `server.js` — Socket.IO room server, roster, host handling, game state, dice/move events, chat/friend functionality, and match history hooks.
- `app/game/MultiplayerGameCanonical.tsx` — client-side live multiplayer game.
- `app/_components/LudoBoardMultiplayer.tsx` — multiplayer board renderer.
- `app/game-online/page.tsx` — online-game entry/wiring.

Host rules:

- The room host owns the board skin for the match.
- A joining player's personal board skin must not override the host's match skin.
- Roster/start-game events provide the host board to clients.
- Profile usernames are loaded from `/api/auth` and passed into room membership.

Seat/team mapping is provided by the canonical engine/rules rather than inventing a new mapping in the UI.

### 6. Bot vs Human — reference implementation

- `app/game/GameBoardContent.tsx` is the working Bot-vs-Human board implementation.
- `/game` is the protected/reference gameplay experience.

This mode is currently treated as the known-good reference for gameplay feel, dice/audio behavior, token interaction, capture/finish behavior, and UI. **Do not modify this board casually.** If another mode needs the same behavior, port the behavior into that mode without regressing `/game`.

### 7. Tournament

- `app/tournament/page.tsx` — tournament list/details/standings.
- `app/tournament/game/page.tsx` — tournament game viewport shell.
- `app/game/TournamentBotGame.tsx` — dedicated tournament Bot-vs-Human board.
- `app/api/tournaments/route.ts` — tournament listing, join/leave, board persistence, win recording and leaderboard.
- `app/api/tournaments/board-state/route.ts` — authenticated tournament board-session restore endpoint.
- `app/api/tournaments/_schema.ts` — tournament DB schema helpers.
- `app/_components/TournamentSessionResume.tsx` — unfinished tournament-session resume helper.

Tournament-specific invariants:

- Tournament board skin is intentionally hard-coded to `classic` unless explicitly changed by product requirements. Do not make it inherit the Shop skin accidentally.
- Tournament board state is persisted per `(tournament_id, user_id)` with a private `board_token`.
- Match state includes an engine version, tokens, turn, roll, pending roll, six streak, bot roll key, winner, win-recorded state, and match number.
- A human tournament win awards +5 points through the server `record_win` transaction.
- `record_win` is idempotent for a board session via `state.winRecorded`.
- Play Again increments the local match number and clears the per-match winner/win-recorded state so the next finished match can earn another +5.
- Leaderboard ranking is points descending, then score-reached time, then username.
- Tournament game page is intentionally viewport-locked with `overflow:hidden`; do not reintroduce document scrolling.

### 8. Tournament scoring data model

`ludo_tournament_player_stats` stores points/wins/eligibility. `ludo_tournament_board_sessions` stores the private board token and JSON game state. `ludo_tournament_entry_payments` stores entry payments. Admin wallet tables support tournament financial accounting.

Never award tournament points only from client state. The client may show progress, but the server transaction is authoritative.

## UI / viewport rules

- Bot-vs-Human `/game` is the protected known-good reference and must not be changed without explicit approval.
- Multiplayer 2-player and 4-player game pages should be viewport-sized and non-scrollable.
- Tournament game should be viewport-sized and non-scrollable.
- Tournament game uses a fixed shell in `app/tournament/game/page.tsx` and a viewport grid in `TournamentBotGame.tsx`.

## Navigation

`AppFrame` provides the generic back control. Tournament detail pages intentionally use `← Back to tournament` rather than a second generic back control.

## Deployment

The project is deployed from GitHub to Railway. The `main` branch is the production source used by the connected Railway service. A code change is not considered live until Railway reports a successful deployment.

## Safe change procedure

1. Inspect the current implementation before editing.
2. Identify whether the requested behavior already exists in the Bot-vs-Human reference implementation or canonical engine.
3. Reuse canonical rules/components rather than creating parallel rule systems.
4. Preserve server authority for multiplayer/tournament state.
5. Preserve tournament board isolation and idempotent scoring.
6. Do not change `/game` unless explicitly requested.
7. Build/deploy and verify Railway status before calling a change live.
8. If a deployment fails, inspect the actual build error and fix that error before changing unrelated code.

## Known historical traps

- Tournament originally failed to pass legal token keys to `CanonicalLudoBoard`, making legal tokens unclickable and removing the breathing animation.
- Tournament originally played the bot roll sound at result time instead of roll start.
- Player tournament rolls had a duplicate dice sound trigger; only the beginning-of-roll event should remain.
- Capture rules must use team relationships, not merely `color !== moverColor`.
- A tournament kill can send the killer to the small centre finish area and must produce the appropriate finish/home sound.
- Tournament win messaging must not be treated as proof that points were persisted; the server response is authoritative.
- Multiplayer board skin is host-owned; never let Player 2's skin become the room skin.

## Do not guess

If a file/path referenced here has moved, search the repository and update this document. Do not create a second competing implementation just because an older path is unavailable.
