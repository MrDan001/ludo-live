# Ludo Live — Level Rewards & Progression

## Purpose

This document is the implementation contract for player level rewards. Read it together with `ARCHITECTURE.md` and `DEVELOPER_HANDOFF.md` before changing progression, XP, Inventory, Shop or player customization.

The rule is simple: **a level reward must have real value**. A reward is either something the player can use, something that records a real achievement, or a server-backed benefit that genuinely changes what the player can do. Do not create mock/placeholder rewards.

## Authoritative flow

```text
Game win / successful diamond purchase
        |
        v
POST /api/progress
        |
        v
PostgreSQL ludo_users row locked in transaction
        |
        +--> calculate XP + level(s)
        |
        +--> getLevelRewardPlan(level)
        |        from lib/levelRewards.ts
        |
        +--> ludo_level_rewards ledger
        |        UNIQUE(user_id, level)
        |
        +--> grant coins/gems
        |
        +--> grant real catalogue item OR gem compensation
        |
        v
response.reward
        |
        +--> ludo-level-reward browser event
        |
        +--> XPLevelCelebration.tsx
        |
        +--> profile next-milestone preview
```

PostgreSQL is authoritative. `localStorage` may mirror XP for UI continuity, but it never grants a reward and never determines ownership.

## XP sources

- Game win in any mode: **+7 XP**.
- Successful diamond purchase: **+15 XP**.
- The server determines the accepted source. Client-supplied arbitrary XP amounts are ignored.

## Level formula

The required XP to advance from level `N` is:

`10 + (N × 5)`

There is no hard-coded maximum level.

## Reward ladder

Every level grants coins. Every fifth level also grants gems. Every tenth level grants a milestone badge and a real usable catalogue item.

## Trophy Room and player identity

The Achievements page is the player's **Trophy Room**. It is not only a history ledger. It surfaces:

- lifetime earned awards from missions, games, store activity and level rewards;
- level milestone journey;
- current equipped board, dice and avatar;
- a prestige score derived from server-recorded progression and accomplishments;
- the player's current title tier;
- a link to the player's public Player Showcase.

The Trophy Room is intentionally designed as a pride/identity surface. Cosmetics are presentation only and never modify Ludo odds or rules.

### Public Player Showcase

`app/player/[username]/page.tsx` is the public-facing player card. Its data comes from `GET /api/player/[username]` and is server-derived from PostgreSQL.

The showcase exposes username, level/XP, current title, prestige, games/wins/losses/tournament wins, achievement count, equipped board/dice/avatar, owned cosmetic counts, earned level milestones, and **only the single next milestone**.

The showcase renders the **real equipped avatar icon** from `lib/customization-catalog.ts`. Its `default` avatar must use the same `🧑🏽‍🎮` representation as the player's own Profile/`EquippedAvatar`; it must not use a separate generic `👤` placeholder. Catalogue avatar IDs are resolved from the same canonical `AVATARS` list.

### Level Journey / progressive track

The Player Showcase contains a vertical **Level Journey** track. It is a continuous level-by-level road rather than a single `Level 10` label.

- For players below Level 5, the visible journey begins at Level 1 so their current level can still be marked exactly.
- From Level 5 onward, the journey begins at Level 5 and continues through the current level plus a short look-ahead.
- Every level is rendered in order (5, 6, 7, 8, ...), with the shared `getLevelRewardPlan(level)` determining the reward shown for that level.
- The inspected player's exact current level receives a prominent **YOU ARE HERE / CURRENT LEVEL** marker.
- On the current-level row, the showcase also displays the player's **current-level XP / XP required**, a progress bar, and the exact **XP remaining to enter the next level**. This is calculated with the canonical `xpRequiredForLevel(level)` function.
- Tenth-level milestones are visually distinguished as trophy nodes.
- The journey is a progress/reputation surface; it does not grant anything from the client.

The road intentionally does not enumerate every future level to an arbitrary infinity. Unlimited progression remains server-side; the UI renders a useful current-level window so the page stays usable.

The next milestone is calculated server-side as the next tenth-level milestone after the inspected player's current level. It is intentionally not a list of all future milestones.

### Canonical navigation contract

`app/_components/PlayerIdentityLink.tsx` is the shared identity link. It routes a player's displayed username/avatar to `/player/<encoded username>`.

Current wired surfaces:

- Friends — friend/request identities and private-chat identity.
- Multiplayer room / live social overlay — roster avatars/names and chat sender names.
- Tournament standings — eligible Top-10 players and participant rows.

These surfaces must reuse `PlayerIdentityLink`; do not create a second profile modal or duplicate showcase implementation.

The canonical showcase requires an authenticated viewer, is server-derived, and does not expose wallet balances, email, password, sessions or other private account data.

### Title hierarchy

- Rookie — default;
- Contender — Level 25+;
- Elite — Level 50+;
- Veteran — Level 75+;
- Legend — Level 100+;
- Tournament Champion — any recorded tournament win;
- Unstoppable — 500+ recorded game wins unless a higher-priority tournament title applies.

Titles are reputation/status signals, not gameplay buffs.

### Prestige

Prestige is a presentation score, not a second XP currency. The current calculation is:

`level × 25 + game wins × 5 + tournament wins × 100 + recorded level rewards × 20`

It must only be calculated from server-recorded data. Clients must never submit their own prestige value.

## Milestones 10–100

| Level | Type | Item | Already-owned compensation |
|---:|---|---|---:|
| 10 | Dice | Golden Dice (`golden`) | 25 gems |
| 20 | Board | Galaxy Space (`galaxy`) | 40 gems |
| 30 | Dice | Fire Dice (`fire`) | 45 gems |
| 40 | Board | Midnight Live (`midnight-live`) | 65 gems |
| 50 | Avatar | Avatar 6 (`avatar-6`) | 100 gems |
| 60 | Board | Candy Land (`candy`) | 60 gems |
| 70 | Dice | Diamond Dice (`diamond`) | 60 gems |
| 80 | Board | Dragon Theme (`dragon`) | 40 gems |
| 90 | Dice | Rainbow Dice (`rainbow`) | 35 gems |
| 100 | Board | Neon Glow (`neon`) | 50 gems |

Milestone item IDs must exist in `lib/customization-catalog.ts`.

## Already-owned rule

A player must never receive a duplicate owned cosmetic. If the milestone item is already owned, the server grants the configured fallback gems instead and records that compensation with the level reward. The fallback is not the original shop price.

## Idempotency

`ludo_level_rewards` uses `PRIMARY KEY(user_id,level)`. Repeated requests cannot grant the same level reward twice. Wallet and ownership mutations occur transactionally with the reward ledger.

## UI behavior

`XPLevelCelebration.tsx` displays the level reward, usable unlock, or already-owned compensation. The Profile page shows the next meaningful milestone. The Achievements page shows the lifetime Trophy Room and current loadout. The Player Showcase shows only the next milestone after the inspected player's current level and a progressive current-level journey marker with exact XP remaining to the next level.

## Shared reward definition

`lib/levelRewards.ts` is the canonical milestone definition. Do not duplicate the milestone table in React or API routes.

## Customization integration

The actual equip/purchase authority remains `app/api/customization/route.ts`. Level rewards grant ownership; they do not bypass the equip system. The Shop catalogue remains `lib/customization-catalog.ts`.

## Access rewards

Do not claim that a level unlocks Ranked, VIP rooms, Elite rooms, tournament qualification or another capability unless the target feature has a real server-side entitlement check. A future access reward must be:

```text
Level milestone -> server entitlement -> target feature server check -> UI unlock
```

## Developer checklist

- [ ] Inspect `lib/levelRewards.ts` and `app/api/progress/route.ts`.
- [ ] Verify every cosmetic ID against `lib/customization-catalog.ts`.
- [ ] Preserve `(user_id, level)` idempotency and already-owned compensation.
- [ ] Keep prestige/title calculations server-derived.
- [ ] Reuse `/api/player/[username]` for public player inspection.
- [ ] Reuse `PlayerIdentityLink` on new player-name/avatar surfaces.
- [ ] Keep the waiting-room avatar sourced from the inspected player's real equipped avatar and preserve it through game-state merges.
- [ ] Keep the showcase avatar resolved from the same authoritative catalogue and use the same default-avatar representation as Profile.
- [ ] Keep the Level Journey continuous and mark the exact current level; show current-level XP and remaining XP to the next level on that same row.
- [ ] Do not expose wallet, email, password, session or other private data in public showcases.
- [ ] Update this document and the architecture/handoff documentation whenever progression or player identity rules change.
- [ ] Build/test affected code before release.
- [ ] Confirm Railway reports `SUCCESS` before calling the release live.
