# Ludo Live — Developer State — 2026-09-02

This is the current implementation handoff for the work completed through 2026-09-02. Read this together with `ARCHITECTURE.md`, `DEVELOPER_HANDOFF.md`, and `MULTIPLAYER_ARCHITECTURE.md` before modifying production code.

## 1. Production / branch

- Repository: `MrDan001/ludo-live`
- Production branch: `main`
- Production platform: Railway
- Current `main` HEAD at documentation time: `7545da60da6e14f9fb286deeae05d1988a966a99`
- Railway must report `SUCCESS` before a release is considered live.

## 2. Multiplayer rebuild — important architectural change

The multiplayer movement implementation was rebuilt without changing Tournament or Bot-vs-Human gameplay.

### Protected modes

**Do not modify these while repairing multiplayer:**

- `/game` Bot-vs-Human
- `/tournament/game` Tournament
- `app/game/GameBoardContent.tsx`
- `app/game/TournamentBotGame.tsx`

Tournament/canonical gameplay is the behavioral reference. Multiplayer must port the required behavior rather than editing the reference mode.

### Active multiplayer entry

- `app/game-online/page.tsx` is the entry route.
- It uses `Suspense` and `dynamic = "force-dynamic"`.
- `app/game-online/OnlineMultiplayerGame.tsx` is the compatibility entry and points to the rebuilt multiplayer implementation.
- `app/game-online/OnlineMultiplayerGameFixed.tsx` contains the rebuilt client.
- `CanonicalLudoBoard` is used for board rendering.
- `DemoDice` is used for dice interaction.
- `ChatVoice` remains integrated into multiplayer.

### Server authority

`lib/onlineLudoAuthority.js` is the multiplayer movement authority.

It now delegates the actual move calculation to the canonical rules API from `lib/ludoRules`:

- `canMove`
- `hasLegalMove`
- `hasWon`
- `playerColorsForSeats`
- `tokenState`
- `applyMove`
- `FINISH`

Do not create a second multiplayer movement/rules engine.

The server calculates the destination and capture result. Client-supplied destination coordinates are not authoritative.

## 3. Multiplayer movement animation contract

The old visual problem was that server final state could overwrite the displayed token immediately, producing a disappearance/reappearance or snap instead of visible movement.

The rebuilt client therefore maintains:

1. An authoritative token snapshot.
2. A separate display-token state.
3. A movement-event queue.
4. A sequential animation routine.

`game-state` updates the authoritative snapshot. During an active movement animation it must not immediately replace the display tokens.

`game-moved` contains movement metadata needed by the client:

- `tokenId`
- `from`
- `to`
- `finalTo`
- `captureProgress`
- `captured`
- `captureToCenter`
- `stateRevision`

Normal moves visibly advance one progress position at a time using approximately **280 ms per step**, matching the Tournament-style visible movement behavior.

### Capture sequence

For a successful kill the intended visible sequence is:

1. Killer starts at `from`.
2. Killer visibly moves one cell at a time to the victim's square (`captureProgress`).
3. Victim is then visibly returned to yard (`position = 0`).
4. Killer proceeds to its authoritative `finalTo`/finish destination.
5. The authoritative server state is finally reconciled with the display state.

The animation must not be replaced with an instant final-state snap.

## 4. Canonical progress / board contract

- `0` = yard.
- `1..51` = shared track.
- `52..57` = color-specific home/finish lane.
- `FINISH` is the final center/small finish destination exposed by the canonical rules.

Multiplayer must use canonical board geometry and progress mapping. Do not invent another physical-track coordinate system.

Every visible traversed cell must be rendered during animation, including home-lane cells.

## 5. Player/team contract

Use `playerColorsForSeats()`.

- In 2-player mode, seat 0 owns Red + Yellow and seat 1 owns Green + Blue.
- In 4-player mode, each seat owns its canonical color.
- A player can only move their assigned colors.
- Teammates cannot capture teammates.

## 6. Legal move highlighting

The multiplayer client calculates UI legality with the same canonical `canMove` rules and passes only legal token keys to `CanonicalLudoBoard`.

Only legal tokens should pulse/be selectable after a dice roll.

The server still validates the move; client legality is presentation/UX only.

## 7. Multiplayer state synchronization

`stateRevision` is used to reject stale game-state/movement information.

Authoritative `game-state` is the final source of truth, but it must not interrupt an in-progress display animation. Once the movement queue is empty, the display is reconciled from the latest authoritative snapshot.

This separation is required to prevent the original snap/disappear/reappear behavior.

## 8. Multiplayer identity / UI

The multiplayer page uses the authenticated profile and customization endpoints to obtain the current player identity, level, coins and equipped avatar where available.

Room roster identity remains server-backed. Chat and voice remain part of the page.

The board is host/theme controlled; player identity remains player-specific.

## 9. Wallet audit architecture

Wallet balance changes are now protected by a PostgreSQL trigger in `app/api/lib/wallet-audit.ts`.

Every wallet-changing operation must provide:

- `source`
- `source_ref`
- `request_id`
- `reason`
- actor identity, or explicit `actor_type = system`

Request metadata can additionally include:

- IP address
- User-Agent

`markWalletContext()` stores these values in PostgreSQL transaction-local settings. The trigger reads them and writes a verified row to `ludo_wallet_audit`.

`adjustWallet()` performs wallet changes inside a transaction with a row lock and audit context.

### Important consequence

Direct `UPDATE ludo_users SET coins=...` statements are no longer safe for wallet mutations unless the same database transaction first establishes valid wallet context.

Do not bypass the audit trigger to make an operation work.

## 10. Username-change fix

The Profile username change costs **1,000 coins**.

The previous implementation directly executed the username update and coin deduction. The wallet-audit trigger rejected the coin update because the request had no required metadata, producing HTTP 500 and the misleading UI message:

`Authentication service is temporarily unavailable.`

The username-change path in `app/api/auth/route.ts` has now been changed to use the wallet-audit context correctly.

Required metadata for this operation is conceptually:

- source: `profile`
- source reference: unique username-change reference
- actor: authenticated user
- reason: username change
- request metadata: IP/User-Agent where available

The username update and the 1,000-coin deduction must be treated as one atomic operation: if the wallet deduction fails, the username change must not partially succeed.

## 11. Wallet audit failure rule

The error:

`Wallet change requires source, source_ref, request_id, reason and actor metadata`

is an intentional protection, not an error to suppress.

When it appears, trace the wallet mutation and add proper metadata at the transaction boundary. Do not change the trigger to accept anonymous/unknown mutations merely to remove the error.

## 12. Existing wallet audit work that must remain

The repository already contains server-authoritative wallet accounting for rewards, events, admin wallet operations and other mutations. New wallet-changing features must use the shared wallet-audit contract rather than adding another accounting mechanism.

Unknown/legacy wallet rows may still exist in historical audit data. Do not rewrite historical records as a substitute for fixing future wallet mutations.

## 13. Known legacy multiplayer file

`lib/multiplayerMove.js` still exists because `server.js` has/had a dependency boundary around the legacy adapter. It must not be deleted blindly.

Before removing it, trace all imports/usages in the current `main` tree and confirm the active Socket.IO path no longer depends on it. The canonical movement implementation is now `lib/onlineLudoAuthority.js` -> `lib/ludoRules`.

## 14. Testing checklist before future multiplayer releases

### Movement

- [ ] Token visibly advances cell-by-cell.
- [ ] Yard-to-track entry uses the canonical first playable position.
- [ ] Home-lane cells are visible in sequence.
- [ ] Final finish position is reached only at the canonical finish.
- [ ] No token disappears and reappears at its final destination.

### Capture

- [ ] Killer visibly reaches victim square.
- [ ] Victim returns to yard after contact.
- [ ] Killer then proceeds to the authoritative finish destination.
- [ ] Both clients see the same resulting authoritative state.
- [ ] Multiple rapid movement events are queued rather than overlapping.

### Multiplayer integrity

- [ ] 2-player Red/Yellow vs Green/Blue mapping is correct.
- [ ] 4-player seat/color mapping is correct.
- [ ] Only legal tokens pulse.
- [ ] Stale `stateRevision` updates are ignored.
- [ ] Chat still works.
- [ ] Voice still works.

### Wallet/profile

- [ ] Username change with >=1,000 coins succeeds.
- [ ] Exactly 1,000 coins are deducted.
- [ ] The wallet audit row contains source, source_ref, request_id, reason and actor.
- [ ] Username change with <1,000 coins is rejected without changing the username.
- [ ] A failed wallet transaction does not leave a partial username update.

## 15. Deployment record

The username-change fix was committed to `main` as:

`991f9395de3fcd2dd0bdf0b6b8cd2c45ba831e7a` — `Fix username change wallet audit transaction`

Railway created deployment:

`fd6c6bec-f4e8-4297-a628-00a6eae0c3fe`

At the time of this handoff, that deployment was still **BUILDING**. The repository `main` subsequently advanced with another commit, so future developers must check the current Railway deployment rather than assuming this historical deployment status is current.

## 16. Golden rules for the next developer

1. Trace the active route before editing.
2. Do not resurrect obsolete multiplayer movement code.
3. Use Tournament/canonical rules as the reference, but do not edit Tournament to repair multiplayer.
4. Keep Bot-vs-Human isolated from multiplayer changes.
5. Keep server movement authoritative and client animation presentation-only.
6. Never bypass wallet audit metadata.
7. Treat wallet and username mutations atomically.
8. Update this document whenever one of these contracts changes.
9. Build the affected code and inspect Railway before calling the release complete.
