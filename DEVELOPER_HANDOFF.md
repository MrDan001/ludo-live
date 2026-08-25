# Ludo Live — Developer Handoff

## Start here

Read these files before making gameplay changes:

1. `ARCHITECTURE.md` — system map and invariants.
2. `package.json` — runtime/build scripts and dependencies.
3. `app/game/GameBoardContent.tsx` — Bot-vs-Human reference gameplay.
4. `lib/ludoEngine.ts` and `lib/canonicalLudoBoard.ts` — canonical movement/board adapters.
5. `app/_components/CanonicalLudoBoard.tsx` — canonical interactive renderer and legal-token animation.
6. `app/_components/DemoDice.tsx` + `app/_components/LudoAudio.tsx` — dice/audio contract.
7. `app/game/MultiplayerGameCanonical.tsx` + `server.js` — online multiplayer contract.
8. `app/game/TournamentBotGame.tsx` + `app/api/tournaments/route.ts` — tournament contract.

## Product rules that are intentional

### Bot vs Human

- This is the known-good reference implementation.
- Do not modify it as part of a multiplayer/tournament fix unless the user explicitly asks for a Bot-vs-Human change.
- Its behavior is the baseline for sound timing, token selection, capture, finish and winner flow.

### Teams

- Human team = Red + Yellow.
- Bot team = Green + Blue.
- A token cannot capture a teammate.
- Opposing teams can capture each other according to the canonical rules.

### Movement

- Yard tokens require a 6 to enter.
- Overshooting the final finish is illegal.
- Finished tokens cannot move.
- Canonical legal-move checks determine which tokens are interactive.
- A legal token must be visually indicated by the canonical breathing/pulse animation.
- Do not make every token clickable and then reject the move later; the board is intentionally driven by `legalTokenKeys`.

### Capture / kill

- A normal single-token capture returns the victim to the yard.
- A kill can award the killer the special small centre finish position in the applicable game rule set.
- Capture and finish/home sounds must both be emitted when the rules cause the killer to enter the finish area after a kill.
- Safe cells must respect the canonical safe-square rules.

### Dice sound

The contract is **one dice sound per roll, at the beginning of the roll**.

- Player: `DemoDice` emits `ludo-audio` with detail `dice` when the user taps the dice.
- Do not emit another `dice` event when the result state arrives.
- Bot: the bot turn path emits its own `dice` event when bot rolling begins because the bot does not use the player's click handler.
- `LudoAudio` owns the actual sound synthesis.

### Audio event contract

`ludo-audio` event details:

- `dice` — roll starts.
- `move` — token movement step/update.
- `capture` — opponent is captured.
- `safe` — token reaches a safe square.
- `home` — token reaches finish/home.
- `win` — match winner.

Use these existing events instead of introducing a second sound system.

## Multiplayer contract

### Host skin

The multiplayer room uses the **host's equipped board skin**. The joining player's personal skin must not replace the room skin.

`server.js` stores the member board and returns the host board through roster/start-game state. `MultiplayerGameCanonical.tsx` consumes that host board.

### Player names

The multiplayer client loads `/api/auth` and uses `user.username`. Socket roster/game state carries that profile name. UI should display the real profile username wherever the player identity is shown.

### Seats

The canonical seat mapping is exposed through `playerColorsForSeats`. Do not create a new seat/color mapping in a UI component.

### Viewport

2-player and 4-player multiplayer are intended to fit the device viewport without document scrolling. Preserve `overflow:hidden`, `100dvh`, and the board sizing rules unless there is a deliberate responsive redesign.

## Tournament contract

### Skin

Tournament currently intentionally uses a hard-coded `classic` theme. This is different from multiplayer. Do not wire Tournament to Shop-equipped board skins unless explicitly requested.

### Persistence

Tournament state is server-backed and isolated per tournament/player through `ludo_tournament_board_sessions` and a private `board_token`.

The board state is saved through `/api/tournaments` with `action: "save_board"` and restored through `/api/tournaments/board-state`.

### Win scoring

The client calls `/api/tournaments` with `action: "record_win"` after a human tournament win.

The server:

1. Authenticates the current player.
2. Locks the board session and player stats.
3. Rejects inactive/invalid tournament sessions.
4. Checks `state.winRecorded` for idempotency.
5. Adds 1 win and 5 points.
6. Sets eligibility at 50 points.
7. Persists `winRecorded=true`.
8. Returns the authoritative points/wins/leaderboard.

Do not replace this with a client-only points increment.

### Play Again

`TournamentBotGame.playAgain()` creates fresh board tokens/state for the next local match, increments `matchNumber`, clears `winner`, and clears `winRecorded`. The next human win can therefore earn another +5.

### Resume

Tournament hard refresh/resume must restore the exact tournament/player board state rather than guessing between active matches.

### Viewport

Tournament game is intentionally static/non-scrollable. `app/tournament/game/page.tsx` provides a fixed viewport shell and `TournamentBotGame` uses a constrained 100dvh layout.

## Shop/customization contract

`app/api/customization/route.ts` is the authoritative API for owned/equipped board/dice/avatar/item state.

The user profile stores `equipped_board` and `equipped_dice`. Shop UI should call the customization API rather than inventing local ownership state.

Multiplayer consumes the host's equipped board for the room. Tournament intentionally does not.

## Authentication contract

- Session cookie: `ludo_session`.
- Server lookup: `lib/auth-session.ts`.
- DB schema/pool: `app/api/auth/_db.ts`.
- Public auth user includes id, username, wallet, progression, owned/equipped customization and account flags.

Do not trust a client-provided user id for privileged operations. Server APIs should derive identity from the authenticated session.

## Database / server authority

PostgreSQL is the persistent source of truth for accounts, customization, tournament entries/stats/board sessions and financial records.

`server.js` owns live Socket.IO room state and emits multiplayer state to connected clients.

Do not assume localStorage is authoritative. Local storage is used for UX/session restoration in some game modes, but server-backed tournament state and authenticated multiplayer state must win when available.

## Testing checklist before merge

- [ ] `npm run build` succeeds.
- [ ] Bot-vs-Human `/game` is unchanged unless the task explicitly targets it.
- [ ] 2-player multiplayer opens without page scrolling.
- [ ] 4-player multiplayer opens without page scrolling.
- [ ] Multiplayer shows real profile usernames.
- [ ] Multiplayer uses host skin.
- [ ] Tournament remains on its intentional classic skin.
- [ ] Tournament legal tokens breathe/pulse and are clickable.
- [ ] Tournament player and bot roll sound starts at roll start only.
- [ ] No duplicate player dice sound occurs when the result appears.
- [ ] Teammates cannot kill each other.
- [ ] Opponents can kill each other.
- [ ] Kill-to-finish produces the appropriate audio.
- [ ] Tournament +5 is reflected in the server leaderboard.
- [ ] Tournament Play Again starts a fresh scoring state.
- [ ] Tournament refresh/reopen restores the correct board.
- [ ] Railway deployment reaches SUCCESS before claiming the release is live.

## Change discipline

When fixing a bug:

1. Reproduce/trace the exact code path.
2. Identify the authoritative source of truth.
3. Reuse the existing canonical implementation.
4. Make the smallest isolated change.
5. Check the diff for accidental changes to protected/known-good areas.
6. Build.
7. Deploy.
8. Check deployment status and logs.
9. Only then report the change as live.

## Protected area

**`app/game/GameBoardContent.tsx` / Bot-vs-Human `/game` is a protected known-good area.** Do not casually refactor it while working on multiplayer or tournament. If behavior must be shared, extract or port the smallest necessary contract without changing its user-facing behavior.

## Handoff principle

A new developer should never need to infer a product rule from a screenshot or from a previous conversation. If a rule changes, update this document and `ARCHITECTURE.md` in the same change when the change is architectural or affects another developer's assumptions.
