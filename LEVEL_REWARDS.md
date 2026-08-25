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
- level milestone journey for Levels 10–100;
- current equipped board, dice and avatar;
- a prestige score derived from server-recorded progression and accomplishments;
- the player's current title tier;
- a link to the player's public Player Showcase.

The Trophy Room is intentionally designed as a pride/identity surface. Cosmetics are presentation only and never modify Ludo odds or rules.

### Public Player Showcase

`app/player/[username]/page.tsx` is the public-facing player card. Its data comes from `GET /api/player/[username]` and is server-derived from PostgreSQL.

The showcase exposes:

- username;
- level and XP;
- current title;
- prestige score;
- games, wins, losses and tournament wins;
- achievement count;
- equipped board, dice and avatar;
- owned cosmetic counts;
- earned level milestones;
- upcoming level milestones.

The showcase is intentionally designed so that another player can inspect someone's experience and collection instead of seeing only a username.

### Canonical navigation contract

`app/_components/PlayerIdentityLink.tsx` is the shared identity link. It routes a player's displayed username/avatar to:

`/player/<encoded username>`

Current wired surfaces:

- **Friends** — friend/request identities and the open private-chat header.
- **Multiplayer room / live social overlay** — roster player names and chat sender names.
- **Tournament standings** — eligible Top-10 players and participant rows.

These surfaces must reuse `PlayerIdentityLink`; do not create a second profile modal or duplicate showcase implementation.

For a player's own identity, the destination may still be the public showcase when the surface is explicitly an inspection surface. Settings/profile navigation remains separate.

The canonical showcase requires an authenticated viewer, is server-derived, and does not expose wallet balances, email, password, sessions or other private account data.

### Title hierarchy

The current derived title rules are:

- Rookie — default;
- Contender — Level 25+;
- Elite — Level 50+;
- Veteran — Level 75+;
- Legend — Level 100+;
- Tournament Champion — any recorded tournament win;
- Unstoppable — 500+ recorded game wins (unless a higher-priority tournament title applies).

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

`XPLevelCelebration.tsx` displays the level reward, usable unlock, or already-owned compensation. The Profile page shows the next meaningful milestone. The Achievements page shows the lifetime Trophy Room and current loadout.

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
- [ ] Do not expose wallet, email, password, session or other private data in public showcases.
- [ ] Update this document and the architecture/handoff documentation whenever progression or player identity rules change.
- [ ] Build/test affected code before release.
- [ ] Confirm Railway reports `SUCCESS` before calling the release live.
