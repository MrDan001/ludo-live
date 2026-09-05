# Ludo Live — Multiplayer Developer Contract

**Reconciled:** 2026-09-05

This document describes the current live multiplayer architecture. The `/game-online` implementation is **locked** because it is currently considered correct. Do not modify it unless the user explicitly reopens it.

## Protected `/game-online` surface

- `/game-online` — active multiplayer entry route.
- `app/game-online/OnlineMultiplayerGame.tsx` — locked active multiplayer implementation.
- `app/game-online/page.tsx` — route shell.
- `app/_components/LudoBoardMultiplayer.tsx` — multiplayer board presentation.
- `server.js` / Socket.IO multiplayer layer — room, roster, dice, movement, chat and state transport.
- `lib/onlineLudoAuthority.js` — server-side multiplayer movement authority.

Do not change this surface while working on unrelated features such as Spin Wheel, Missions, Shop, Events, Tournament or Bot-vs-Human.

## Authority model

`game-state` from the server is authoritative for live multiplayer gameplay.

The server owns:

- room membership;
- player seats/colors;
- turn state;
- legal movement;
- dice result;
- token positions;
- capture/kill result;
- winner/match state;
- state revision.

The client is responsible for presentation, local animation and user input. A client-supplied move destination is not authoritative.

## Player/team mapping

Use `playerColorsForSeats()`.

- 2 players: seat 0 = Red + Yellow; seat 1 = Green + Blue.
- 4 players: one canonical color per seat.
- Players may move only their assigned colors.
- Teammates cannot capture teammates.

## Movement presentation

The multiplayer client separates authoritative state from display/animation state so server updates do not cause token snapping during a visible move.

Movement is presented cell-by-cell using the server-authoritative move result and canonical progress mapping.

`stateRevision` is used to reject stale authoritative state.

## Capture / kill presentation

For a successful capture, the visible presentation remains ordered:

1. Killer moves toward the victim's square.
2. Victim is returned to yard.
3. Killer continues to the authoritative final destination.
4. Display state reconciles with the latest authoritative server state.

Do not reimplement capture detection in the UI.

## Board progress

- `0` = yard/home.
- `1..51` = shared track.
- `52..57` = color-specific home/finish lane.
- The canonical engine defines the exact final finish destination.

Use canonical board geometry and `lib/ludoEngine.ts` / `lib/ludoRules.ts`. Do not invent another multiplayer coordinate system.

## Legal-token highlighting

The client may use canonical `canMove()` for visual highlighting, while the server validates the actual move independently.

Only legal tokens should be presented as selectable after a roll.

## Dice and audio

`app/_components/DemoDice.tsx` owns local dice interaction.

Canonical audio events are:

- `dice`
- `move`
- `capture`
- `safe`
- `home`
- `win`

Do not add a second local dice sound merely because the server result arrives.

## Identity and cosmetics

Player identity and player-specific equipped avatar/customization remain player-specific.

The room/board theme is host-authoritative for the active room. A joining player's personal board/theme must not overwrite the host's room presentation.

## Boundary with local Bot-vs-Human and Tournament

The protected local reference implementations are:

- `/game` → `app/game/GameBoardContent.tsx`
- `/tournament/game` → `app/game/TournamentBotGame.tsx`

When multiplayer needs equivalent rules behavior, reproduce the required behavior in the multiplayer implementation rather than editing the protected local reference to solve a multiplayer-only problem.

## Testing contract

For 2-player and 4-player rooms verify:

- correct seat/color ownership;
- legal-token highlighting;
- visible movement through each progress cell;
- canonical yard entry and home-lane movement;
- safe-cell protection;
- ordered capture animation;
- identical final authoritative state on both clients;
- room/chat/voice behavior.

## Current lock

**The `/game-online` multiplayer page is locked. Do not modify it unless the user explicitly asks to work on it again.**

This lock is a product boundary, not a suggestion.
