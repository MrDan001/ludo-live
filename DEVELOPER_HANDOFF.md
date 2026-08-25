# Ludo Live — Developer Handoff

## Read this first

Before changing production behavior, read `ARCHITECTURE.md`, `LEVEL_REWARDS.md` and this file. The project has several protected contracts. **Do not guess from screenshots, old code, or previous conversation context. Trace the current implementation first.**

## Non-negotiable engineering rules

1. Inspect the current code path before editing.
2. Identify the authoritative server/API/database source of truth.
3. Reuse canonical engines/components/APIs instead of creating parallel implementations.
4. Keep financial, wallet, ownership, tournament and progression mutations server-authoritative.
5. Keep `/game` Bot-vs-Human as the protected known-good reference unless explicitly asked to change.
6. Keep multiplayer/tournament viewport behavior intact unless a responsive redesign is explicitly requested.
7. After code changes, build and inspect Railway deployment logs.
8. Never call a change live until Railway reports `SUCCESS`.
9. When a deployment fails, fix the exact reported error before touching unrelated code.
10. When a product rule changes, update both `ARCHITECTURE.md` and this handoff document, plus the focused feature MD when one exists.

## Gameplay contracts

### Canonical board/rules

Use `lib/ludoRules.ts`, `lib/ludoEngine.ts`, `lib/canonicalLudoBoard.ts` and `CanonicalLudoBoard` rather than inventing another movement/geometry system.

Human team = Red + Yellow. Bot team = Green + Blue. Teammates cannot capture teammates.

Legal tokens are determined by canonical legal-move checks and passed as `legalTokenKeys`; do not make every token clickable and reject illegal moves afterward.

### Dice/audio

`DemoDice` owns the player roll-start event. `LudoAudio` is the canonical sound system.

One player `dice` sound per roll, at roll start. Do not trigger another player dice sound when the result appears. Bot paths may emit their own roll-start sound because bots do not click `DemoDice`.

Supported audio events: `dice`, `move`, `capture`, `safe`, `home`, `win`.

### Protected reference

`app/game/GameBoardContent.tsx` / `/game` is the Bot-vs-Human reference. Do not casually modify it while fixing multiplayer, tournament, Shop, Inventory, admin, or other pages.

## Player identity and progression integration

### Player Showcase

`/player/<username>` is the canonical public player inspection route. Reuse `app/_components/PlayerIdentityLink.tsx` anywhere a player name/avatar should be inspectable. Do not create parallel profile modals or duplicate player-stat calculations.

The showcase is server-derived from PostgreSQL and intentionally excludes private wallet, email, password and session data. It displays the player's current title, level, prestige, achievements, loadout and **only the single next milestone** after the player's current level.

The showcase avatar is resolved from the same authoritative `AVATARS` catalogue used by customization. Never replace a real equipped avatar ID with a generic icon when the catalogue contains it.

The showcase also has a progressive **Level Journey** road. From Level 5 onward it renders sequential levels and highlights the inspected player's exact current level with a current-location marker. For players below Level 5 it starts at Level 1 so the current marker remains visible. The road is a UI window over unlimited progression; it does not cap or grant levels.

### Multiplayer waiting room

`app/_components/LiveSocial.tsx` is the canonical waiting-room UI. Its player cards must use real roster identities and link each name/avatar to the Player Showcase. The displayed avatar is resolved from the inspected player's authoritative `equipped.avatar` and `lib/customization-catalog.ts`; generic placeholder avatars must not replace a real equipped avatar.

Canonical `game-state` updates may omit cosmetic fields. Merge waiting-room state by stable player identity and preserve an already-resolved `avatar`, `board`, `dice`, and name unless the newer server state explicitly supplies a replacement. Avatar enrichment is written back into member state so unrelated UI updates cannot make the avatar disappear.

The room layout is intentionally a 2x2 seat grid for the existing 2/4-player room sizes, with host crown, Ready/Not Ready state, empty-seat invite, game mode/stake summary, voice control, host-only Start Game and a compact chat button. The permanent chat text area is removed; the `💬` button opens the existing Socket.IO room chat in a drawer/sheet. The current system has no server-backed betting amount, so the UI must say `Free` rather than imply a fake wager.

The room's board/theme remains host-authoritative; avatar identity remains player-specific.

### Level rewards

Read `LEVEL_REWARDS.md` before changing reward or milestone behavior. Level rewards are server-authoritative, idempotent by `(user_id, level)`, and already-owned milestone cosmetics convert to configured gem compensation rather than duplicates.

## Deployment discipline

Build/test the affected route and inspect Railway after every production change. If Railway fails, fix the exact error first. Do not call a deployment live until the service reports `SUCCESS`.
