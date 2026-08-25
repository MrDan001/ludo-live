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

The showcase is server-derived from PostgreSQL and intentionally excludes private wallet, email, password and session data. It displays the player's current hierarchy title, level, prestige, achievements, loadout and **only the single next milestone** after the player's current level.

The showcase avatar is resolved from the same authoritative `AVATARS` catalogue used by customization. Never replace a real equipped avatar ID with a generic icon when the catalogue contains it.

The canonical progression starts at **Level 1**. Level 0 is a legacy/internal value only and must never be shown as the player's public level. New registered and guest accounts start at Level 1. Legacy Level 0 values are normalized to Level 1 at the auth/progression/showcase API and client progression boundaries.

The Showcase Level Journey is a progressive road that **starts at Level 1**. Level 0 is never rendered as a public journey node. For a legacy Level 0 record, the visible journey position is normalized to Level 1 so the player is not presented with a Level 0 public milestone. The current visible level gets the 📍 marker and `CURRENT LEVEL` pill. The separate `YOU ARE HERE` text is intentionally removed, as is the explanatory paragraph above the road. The current row continues to show current-level XP, progress and XP remaining to the next level using canonical `xpRequiredForLevel()`.

### Showcase reputation/stat calculation contract

`app/api/player/[username]/route.ts` is the authoritative source for the four Showcase counters:

- **Games** = completed rows in `ludo_match_history` for the player.
- **Wins** = `ludo_match_history` rows with `result='win'`.
- **Tournament Wins** = tournament `gold` badges only. A gold badge means the player finished **1st place** in that tournament. The broader tournament-entry `status='winner'` is prize-eligibility/Top-10 state and must not be used as a championship count.
- **Achievements** = unique earned achievement/badge unlocks: claimed level milestone rewards + reached win thresholds (1, 10, 25, 50, 100, 250, 500 wins, each once) + stored tournament badges (participation, Top-10, gold, silver, bronze). Individual match wins are not counted one-by-one as achievements.

### Hierarchy

Hierarchy is independent of Level and Prestige. It is based on verified active game-session time:

- 0–<1 hour: **On Your Way**
- 1 hour: **Rookie**
- 3 hours: **Dabbler**
- 10 hours: **Hobbyist**
- 20 hours: **Enthusiast**
- 40 hours: **Devotee**
- 60 hours: **Fanatic**
- 100 hours: **Expert**
- 300 hours: **Prodigy**
- 500 hours: **Champion**
- 750 hours: **Mastermind**
- 1,000 hours: **Legend**
- 1,500 hours: **Grandmaster**
- 2,000 hours: **Immortal**

The server derives hierarchy from `floor(total_active_seconds / 3600)`. It does not use level, wins, tournament wins, cosmetic ownership or client-provided hours. `Tournament Champion` remains an achievement/title concept and is not part of this hours ladder.

### Active-time rewards

Only game-session surfaces count: `/room`, `/game`, `/game-online`, and `/tournament/game`.

Every completed 30 minutes grants:

- Normal period: **1 free spin + 5 XP**.
- Rush Hour, **17:00–20:00 Africa/Lagos**: **3 free spins + 15 XP**.

`app/_components/ActiveSpinRewards.tsx` sends heartbeats only while the player is on an eligible game-session surface and the document is visible. `/api/spin/activity` is authoritative, caps heartbeat elapsed time, persists total active seconds, grants the spin balance, and awards XP/level rewards transactionally. The client cannot directly set spins, XP or hierarchy hours.

### Multiplayer waiting room

`app/_components/LiveSocial.tsx` is the canonical waiting-room UI. Its player cards must use real roster identities and link each name/avatar to the Player Showcase. The displayed avatar is resolved from the inspected player's authoritative `equipped.avatar` and `lib/customization-catalog`; generic placeholder avatars must not replace a real equipped avatar.

The Player Showcase endpoint is authoritative for roster avatar enrichment. If a Socket.IO roster/game-state payload contains `avatar: "default"` while the player endpoint reports another equipped catalogue avatar, the endpoint value wins. This prevents a server roster update from masking the real avatar.

Canonical `game-state` updates may omit cosmetic fields. Merge waiting-room state by stable player identity and preserve an already-resolved `avatar`, `board`, `dice`, and name unless the newer server state explicitly supplies a replacement. Avatar enrichment is written back into member state so unrelated UI updates cannot make the avatar disappear.

The room layout is intentionally a 2x2 seat grid for the existing 2/4-player room sizes, with host crown, Ready/Not Ready state, empty-seat invite, game mode/stake summary, voice control, host-only Start Game and a compact chat button. The permanent chat text area is removed; the `💬` button opens the existing Socket.IO room chat in a drawer/sheet. The current system has no server-backed betting amount, so the UI must say `Free` rather than imply a fake wager.

The room's board/theme remains host-authoritative; avatar identity remains player-specific.

### Level rewards

Read `LEVEL_REWARDS.md` before changing reward or milestone behavior. Level rewards are server-authoritative, idempotent by `(user_id, level)`, and already-owned milestone cosmetics convert to configured gem compensation rather than duplicates.

The Level 1 starting rule is also reflected in `lib/playerProgress.ts`, `app/api/auth/route.ts`, `app/api/progress/route.ts`, `app/api/player/[username]/route.ts` and `/profile`. Do not reintroduce a Level 0 default or render `level || 0` in player-facing progression UI.

## Deployment discipline

Build/test the affected route and inspect Railway after every production change. If Railway fails, fix the exact error first. Do not call a deployment live until the service reports `SUCCESS`.
