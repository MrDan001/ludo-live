# Ludo Live — Multiplayer Developer Contract

## Purpose

This document is the implementation contract for **2-player and 4-player live multiplayer**. Read this before changing multiplayer gameplay, board rendering, token movement, valid-move highlighting, capture/block behavior, or multiplayer audio.

## Protected references — DO NOT MODIFY

- **Bot vs Human:** `app/game/GameBoardContent.tsx` and `/game` are the known-good gameplay/visual reference.
- **Tournament:** `app/tournament/game/page.tsx`, `app/game/TournamentBotGame.tsx`, and the canonical Tournament gameplay/rules are production-approved and must remain untouched when fixing multiplayer.
- `lib/ludoRules.js` / `lib/ludoRules.ts` is the canonical rules source. Multiplayer must reuse it; do not create a competing Ludo rules engine.

When multiplayer needs behavior that already exists in Tournament, port the behavior into multiplayer without editing Tournament.

## Multiplayer entry points

- `app/game/MultiplayerGameCanonical.tsx` — live multiplayer client, Socket.IO connection, local state projection, turn/dice handling, token selection and audio event dispatch.
- `app/_components/LudoBoardMultiplayer.tsx` — multiplayer board presentation.
- `app/_components/LudoBoard.tsx` — shared board geometry/token renderer. Avoid changing it globally when a multiplayer-only wrapper or overlay can solve the problem.
- `server.js` — Socket.IO room state and live multiplayer events.
- `lib/ludoRules.js` — canonical movement, board-cell mapping, block, safe-square, capture and win logic.
- `lib/ludoEngine.ts` — typed adapter over canonical rules.
- `lib/multiplayerMove.js` — multiplayer move adapter; use this as the boundary between socket payloads and canonical rules.

## Player/team mapping

- 2 players: seat 0 owns **Red + Yellow**; seat 1 owns **Green + Blue**.
- 4 players: one canonical color per seat.
- Use `playerColorsForSeats()` from the canonical rules. Do not duplicate seat mapping in UI.
- A player can move only tokens belonging to their assigned colors.

## Authoritative movement contract

The client may calculate legal moves for UI feedback, but the server is authoritative.

Required flow:

1. Current player rolls the dice.
2. Server records the dice value and pending move.
3. Client highlights only legal tokens.
4. Player selects one highlighted token.
5. Server validates ownership and the dice value.
6. Server calls the canonical `canMove()` / `applyMove()` rules.
7. Server applies block/safe-square/capture rules.
8. Server broadcasts the resulting authoritative token state to the room.
9. Both clients render the same state.

Never trust a client-supplied destination (`to`) as the source of truth.

## Board progress / coordinate contract

Canonical progress is:

- `0` = yard/home area; token has not entered the track.
- `1..51` = the 51 shared/main-track progress positions.
- `52..57` = the six color-specific home/finish-lane positions.
- `58` / canonical `FINISH` = final small center finish position.

A token entering its home lane must visibly occupy **each of the six home-lane cells in order**. It must not disappear from the board and jump directly to the center finish box.

Use `getTokenCell(color, progress)` from the canonical rules for geometry. Do not invent an alternate offset or physical-track calculation in multiplayer.

### Entry-square warning

The first playable progress is canonical progress `1`. If a multiplayer token visually appears one cell ahead of the Tournament/Bot-vs-Human reference, fix the **multiplayer rendering/coordinate mapping**, not the canonical rules.

## Block and capture contract

### Blocks

- Two opposing tokens occupying the same physical cell form a block.
- A move must not pass through or land on an opposing two-token block.
- Block detection must use canonical physical-cell mapping, not raw progress-number equality.

### Capture

- Capture is allowed only when the canonical safe-square and opponent-count rules allow it.
- A single capturable opponent is returned to yard (`position = 0`, `state = "yard"`).
- Safe squares do not permit capture.
- Preserve the exact canonical Tournament behavior for the attacking token after a successful kill. Do not substitute ordinary-Ludo assumptions for the existing product rule.

## Valid-token breathing pulse

After a player rolls, `legalTokenKeys` contains only tokens that can legally move for that dice value.

- The multiplayer board must actually pass/render `legalTokenKeys`.
- Only legal tokens receive the breathing/pulse effect.
- Do not make every token pulse.
- Do not make every token clickable and reject illegal moves afterward.
- Pulse disappears when the dice is consumed, turn changes, or the move animation completes.

## Token presentation

Multiplayer tokens must not display numeric token IDs. IDs are internal state identifiers only.

Do not expose `token.id` as visible text on the board.

## Movement animation

The authoritative state determines the final position; animation is presentation only.

- Animate the token through each traversed cell.
- Do not skip the six home-lane cells.
- Capture/kill animation must finish before the resulting yard state is visually settled where applicable.
- Do not mutate Tournament/Bot-vs-Human animation code to fix multiplayer.

## Audio contract

`DemoDice` owns the local player roll-start sound:

`dice button tap -> exactly ONE local dice event -> dice animation -> server result`

Do **not** emit a second dice sound when the number/result arrives.

For multiplayer synchronization, remote players must also hear the relevant event on their own devices. The implementation should distinguish:

- **Local roll start:** local `DemoDice` plays the roll-start sound once.
- **Remote roll start:** the server/socket event tells other clients to play the roll-start sound once.
- **Local result:** do not play another dice sound.
- **Remote result:** do not play another dice sound.
- `move`, `capture`, `safe`, `home`, and `win` events should likewise be broadcast when the action is authoritative, so every connected player hears the same game event.

Canonical audio events are: `dice`, `move`, `capture`, `safe`, `home`, `win`.

## State synchronization

`game-state` is authoritative. Clients should ignore stale revisions and project server token positions into their local rendering state.

A cosmetic update must not overwrite gameplay state. A player's board skin is host-authoritative; player-specific identity remains player-specific.

## Testing checklist

Before calling a multiplayer release complete:

### 2-player

- [ ] Both players join the same room.
- [ ] Correct Red/Yellow vs Green/Blue ownership.
- [ ] Ready/turn state works.
- [ ] Rolling produces one local sound and one remote sound.
- [ ] Only valid tokens pulse.
- [ ] Token exits on canonical first entry square.
- [ ] Token moves through all 51 shared-track positions correctly.
- [ ] Token moves visibly through home-lane cells 52–57.
- [ ] Token reaches center only at canonical finish.
- [ ] Safe square prevents capture.
- [ ] Single opponent capture returns opponent to yard.
- [ ] Two-opponent block cannot be crossed/captured.
- [ ] Both devices receive identical authoritative state.

### 4-player

Repeat the movement, pulse, block, capture, home-lane and audio checks with all four colors/seats.

## Deployment discipline

- Do not call a multiplayer change live until Railway reports `SUCCESS`.
- If Railway fails, fix the reported build/runtime error before unrelated changes.
- Do not alter Tournament or Bot-vs-Human while repairing multiplayer.
- Update this document whenever multiplayer architecture or gameplay contracts change.
