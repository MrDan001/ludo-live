# Ludo Live — Multiplayer Developer Contract

## Purpose

This document is the implementation contract for **2-player and 4-player live multiplayer**. Read it before changing multiplayer gameplay, board rendering, token movement, valid-move highlighting, capture/block behavior, chat, voice, or multiplayer audio.

## Protected references — DO NOT MODIFY

- **Bot vs Human:** `app/game/GameBoardContent.tsx` and `/game` are the protected gameplay reference.
- **Tournament:** `app/tournament/game/page.tsx` and `app/game/TournamentBotGame.tsx` are the protected Tournament reference.
- **Canonical rules:** `lib/ludoRules.js` / `lib/ludoRules.ts` and `lib/ludoEngine.ts` are the rules source of truth.

When multiplayer needs behavior that already exists in Tournament, reproduce the behavior in multiplayer without editing Tournament or Bot-vs-Human.

## Active multiplayer entry points

- `app/game-online/page.tsx` — `/game-online` entry route; uses `Suspense` and `force-dynamic`.
- `app/game-online/OnlineMultiplayerGame.tsx` — compatibility entry for the active rebuilt client.
- `app/game-online/OnlineMultiplayerGameFixed.tsx` — rebuilt multiplayer client and movement presentation.
- `app/_components/CanonicalLudoBoard.tsx` — canonical board presentation/interaction.
- `app/_components/DemoDice.tsx` — dice UI and local roll interaction.
- `app/_components/ChatVoice.tsx` — shared room voice implementation.
- `server.js` / multiplayer Socket.IO layer — room, roster, dice, movement, chat and game-state transport.
- `lib/onlineLudoAuthority.js` — server-side multiplayer movement authority.

`lib/multiplayerMove.js` is a legacy adapter that must not be deleted blindly. Trace current imports before removing it.

## Movement source of truth

`lib/onlineLudoAuthority.js` now delegates movement calculation to the canonical `lib/ludoRules` implementation, including `applyMove()` and canonical legality/capture/win checks.

The server calculates the authoritative result. The client never treats a client-supplied destination as authoritative.

The movement event includes enough information for presentation:

- `tokenId`
- `from`
- `to`
- `finalTo`
- `captureProgress`
- `captured`
- `captureToCenter`
- `stateRevision`

## Movement animation architecture

The previous multiplayer implementation could receive the final `game-state` and immediately render the final token position. That caused tokens to disappear/reappear or visually snap instead of counting through the board.

The rebuilt client separates **authoritative state** from **display state**:

1. `game-state` is normalized into an authoritative token snapshot.
2. A `game-moved` event is placed into a client-side movement queue.
3. The display token remains under animation control while the move is running.
4. The token advances through each traversed progress cell at roughly **280 ms per step**.
5. When the queue is empty, display state is reconciled with the latest authoritative snapshot.

`stateRevision` prevents stale server updates from being applied.

## Capture / kill animation contract

For a successful capture, the visual sequence is explicitly:

1. Killer starts at `from`.
2. Killer moves visibly, one progress step at a time, to the victim's square (`captureProgress`).
3. Victim is returned to yard (`position = 0`).
4. Killer proceeds to the authoritative `finalTo` / finish destination.
5. Final display is reconciled with authoritative `game-state`.

Do not collapse this sequence into an instant final-state update.

The canonical authority supplies the capture result. Do not reimplement capture detection in the UI.

## Board progress contract

- `0` = yard/home.
- `1..51` = shared/main track.
- `52..57` = color-specific home/finish lane.
- `FINISH` from canonical rules = final small center finish destination.

Use canonical board geometry and progress mapping. Do not invent another physical-track coordinate system in multiplayer.

Every traversed visible cell must be rendered, including home-lane cells.

## Player/team mapping

Always use `playerColorsForSeats()`.

- 2 players: seat 0 = Red + Yellow; seat 1 = Green + Blue.
- 4 players: one canonical color per seat.
- Players may move only their assigned colors.
- Teammates cannot capture teammates.

## Legal-token highlighting

The client may calculate legality for UI using canonical `canMove()`.

- Only legal tokens are passed to `CanonicalLudoBoard` through `legalTokenKeys`.
- Only legal tokens pulse/become selectable after a dice roll.
- The server validates the final move independently.

Never make every token clickable and reject illegal moves only after selection.

## State synchronization

`game-state` is authoritative.

- Ignore stale `stateRevision` values.
- Update the authoritative snapshot on every valid state update.
- Do not overwrite animated display tokens while a movement is active.
- Reconcile display from the newest authoritative snapshot after animation completes.
- Cosmetic/player metadata must not overwrite gameplay positions.

## Audio

Canonical audio events are `dice`, `move`, `capture`, `safe`, `home`, and `win`.

`DemoDice` owns the local player roll-start event. Do not play a second local dice sound when the server result arrives. Remote roll events must be synchronized through the multiplayer event path.

## Player identity / room UI

The online game uses authenticated profile/customization data for player name, level, coins and equipped avatar where available. Chat and voice remain integrated.

The room/board theme remains host-authoritative; player identity and equipped avatar remain player-specific.

## Testing checklist

### 2-player

- [ ] Both players join the same room.
- [ ] Red/Yellow vs Green/Blue ownership is correct.
- [ ] Ready and turn state works.
- [ ] Only legal tokens pulse.
- [ ] Normal movement is visibly cell-by-cell.
- [ ] Yard entry uses canonical first progress.
- [ ] Home-lane movement visibly traverses each cell.
- [ ] Finish uses the canonical final destination.
- [ ] Safe squares prevent capture.
- [ ] Capture shows killer-to-victim movement, victim-to-yard, then killer-to-finish.
- [ ] Both clients converge on identical authoritative state.
- [ ] Chat works.
- [ ] Voice works.

### 4-player

Repeat movement, legal-token, home-lane, capture, synchronization, chat and voice checks with all four seats/colors.

## Protected-mode rule

**Do not edit Tournament or Bot-vs-Human to fix a multiplayer defect.** Multiplayer is its own client presentation path but must use the canonical rules/reference behavior.

## Deployment discipline

- Build the affected multiplayer code.
- Inspect Railway build/runtime logs.
- Do not call the release live until Railway reports `SUCCESS`.
- Update this document and `DEVELOPER_STATE_2026-09-02.md` whenever the multiplayer contract changes.
