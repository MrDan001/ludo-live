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

Examples:

- Level 0 → 1: 10 XP
- Level 1 → 2: 15 XP
- Level 2 → 3: 20 XP
- Level 10 → 11: 60 XP

There is no hard-coded maximum level. Milestone cosmetics cycle after the tenth configured milestone, so levels 110, 120, 130, etc. continue to work.

## Reward ladder

Every level grants coins:

`250 + ((level - 1) × 50)`

Every fifth level also grants gems:

`10 + floor(level / 10) × 5`

Every tenth level grants a milestone badge and a **real, usable Shop catalogue item**.

### Milestones 10–100

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

These IDs are intentionally taken from `lib/customization-catalog.ts`. A developer must not put an arbitrary/mock ID into `lib/levelRewards.ts`.

## Already-owned rule

A player must never receive a duplicate owned cosmetic.

At the moment the level reward is created, the server locks the player row and checks the authoritative ownership arrays:

- `owned_boards`
- `owned_dice`
- `owned_avatars`
- `owned_items`

If the milestone item is not owned:

1. Add its ID to the correct ownership array.
2. Return it in `reward.unlocks`.
3. The player can equip it through the existing `/api/customization` endpoint.

If the milestone item is already owned:

1. Do not append another copy.
2. Add the configured `fallbackGems` to the reward transaction.
3. Record the amount in `ludo_level_rewards.compensation_gems`.
4. Return the item in `reward.compensations` so the UI explains exactly why gems were awarded.

The compensation is deliberately **not** the original shop price. It is a configured milestone fallback value, preventing the level system from becoming an unintended shop-refund exploit.

## Idempotency

`ludo_level_rewards` has:

`PRIMARY KEY(user_id, level)`

The server inserts with `ON CONFLICT(user_id, level) DO NOTHING`.

Therefore a repeated request cannot grant the same level reward twice. Wallet and ownership changes are performed in the same transaction as the reward ledger insertion.

## UI behavior

### Level-up celebration

`app/_components/XPLevelCelebration.tsx` listens for:

- `ludo-progression-levelup`
- `ludo-level-reward`

The celebration displays:

- coins received
- gems received
- milestone badge
- newly unlocked usable item
- already-owned item + exact gem compensation

When a new cosmetic is unlocked, the message tells the player to open **Inventory → My Items** to equip it.

### Profile milestone preview

`app/profile/page.tsx` uses `getNextMilestone()` from `lib/levelRewards.ts` to show the next meaningful milestone and the XP remaining to reach it.

This is a preview only. It does not grant anything. The server remains the authority when the level is actually reached.

## Shared reward definition

`lib/levelRewards.ts` is the canonical client/server-safe definition of the milestone ladder.

It exports:

- `MILESTONE_UNLOCKS`
- `getLevelRewardPlan(level)`
- `getNextMilestone(level)`

Do not duplicate the milestone table in React components or API routes. If a reward changes, update `lib/levelRewards.ts` and this document in the same change.

## Customization integration

The actual equip/purchase authority remains:

`app/api/customization/route.ts`

It checks ownership before allowing `action=equip`. Level rewards only grant ownership; they do not bypass or duplicate the equip system.

The Shop catalogue remains:

`lib/customization-catalog.ts`

If an item is removed from the catalogue, its level milestone must be changed before deployment. Never leave a level reward pointing at a non-existent item.

## What is intentionally NOT implemented as a fake reward

The level system does **not** claim to unlock Ranked, VIP rooms, Elite rooms, tournament qualification or other access unless the corresponding feature has a real server-side entitlement check.

This is deliberate. A future access reward must follow this pattern:

```text
Level milestone
    -> server entitlement/permission record
    -> target feature checks entitlement on the server
    -> UI displays the unlocked feature
```

Adding only a badge saying `VIP UNLOCKED` without enforcing VIP access is prohibited.

## Developer checklist

Before changing the level reward system:

- [ ] Inspect `lib/levelRewards.ts`.
- [ ] Inspect `app/api/progress/route.ts`.
- [ ] Inspect `lib/customization-catalog.ts`.
- [ ] Inspect `app/api/customization/route.ts`.
- [ ] Keep reward grants inside the PostgreSQL transaction.
- [ ] Preserve `(user_id, level)` idempotency.
- [ ] Verify every cosmetic ID exists in the Shop catalogue.
- [ ] Preserve already-owned gem compensation.
- [ ] Update `XPLevelCelebration.tsx` if the reward payload changes.
- [ ] Update the profile milestone preview if the reward ladder changes.
- [ ] Update this file and the main architecture/handoff documentation for product-rule changes.
- [ ] Build/test the affected code before calling the release complete.
- [ ] Confirm Railway reports `SUCCESS` before saying the feature is live.
