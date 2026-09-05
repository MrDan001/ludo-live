# Ludo Live — Spin Wheel Contract

**Reconciled:** 2026-09-05

This document describes the current Spin Wheel implementation. The repository code and PostgreSQL state are authoritative.

## 1. Surfaces

Player:

- `/spin`

Spin reward claim/history:

- `/spin-rewards`

Admin:

- `/dbase/spin`

API:

- `GET /api/spin`
- `POST /api/spin`
- `GET /api/admin/spin`
- `POST /api/admin/spin`
- `GET/POST /api/spin/rewards`

## 2. Fixed eight-slot wheel

The player wheel contains **exactly 8 slots**.

The configuration is stored in PostgreSQL table `ludo_spin_wheel_slots` with slot keys `0–7`.

The eight default slots are:

1. 100 Coins — weight 25
2. 250 Coins — weight 20
3. 500 Coins — weight 12
4. 1 Gem — weight 12
5. 3 Gems — weight 8
6. 5 Gems — weight 5
7. Extra Spin ×1 — weight 8
8. 1,000 Coins — weight 10

These are defaults only. Admin can replace the contents of any existing slot.

## 3. Admin control

Admin edits one of the eight existing slots. The Admin UI does not provide Add, Delete or Disable actions, so the wheel remains eight slots at all times.

For each slot Admin can change:

- Reward type: Coins, Gems, Extra Spin or Shop Item
- Display label
- Icon
- Amount
- Probability/weight

A Shop Item slot must reference a currently available item from the canonical Shop catalogue.

The Admin API validates the slot number, reward type, positive amount where applicable, positive probability and Shop item reference before writing the slot.

## 4. Single source of truth

`ludo_spin_wheel_slots` is the only Spin Wheel configuration source.

The previous `ludo_spin_rewards` configuration table is retired by the rebuilt Spin API and Admin API. It is not used for reading, displaying, selecting or paying Spin rewards.

The existing `ludo_spin_state` table remains the authoritative per-user free-spin balance.

The existing `ludo_spin_item_rewards` table remains the authoritative pending/claimed Shop-item Spin reward history.

## 5. Spin selection and payout

The server reads one complete eight-slot snapshot, chooses one winning slot using its configured probability/weight and applies the reward inside a database transaction.

Coins/Gems are credited through the existing wallet-audit path.

Extra Spin increases the user's free-spin balance by the configured amount.

Shop Item rewards are written to `ludo_spin_item_rewards` for the existing Spin Rewards claim flow.

The client never decides the winning reward and never directly awards currency or inventory ownership.

## 6. Board/reward synchronization

A successful `POST /api/spin` response contains:

- the exact eight-slot wheel snapshot used for the spin;
- a wheel configuration version derived from slot timestamps;
- the winning slot index;
- the exact prize object;
- the resulting free-spin balance.

The player wheel animates using the returned snapshot and returned winning slot index. It does not perform a second reward lookup before calculating the landing position.

Therefore an Admin edit made while a spin animation is already running cannot make that animation visually land on a different slot from the prize the server already awarded.

After the animation finishes, the player refreshes the live wheel configuration so subsequent spins use the new Admin configuration.

## 7. Authentication

Spin Wheel is an authenticated player feature. Unauthenticated or guest requests are rejected by `/api/spin` because Shop Item rewards require a registered account/inventory destination.

## 8. Active-time free spins

Active-play earning remains a separate server-authoritative subsystem:

- `app/_components/ActiveSpinRewards.tsx`
- `POST /api/spin/activity`
- `ludo_spin_state`

The current active-time endpoint grants the free-spin balance and progression rewards; Spin Wheel only consumes that balance.

Only visible eligible game-session surfaces contribute active time:

- `/room`
- `/game`
- `/game-online`
- `/tournament/game`

The current server implementation uses a 30-minute interval and a Nigeria-time Rush Hour window of 17:00–20:00 `Africa/Lagos`. The active-time endpoint is the source of truth for its exact reward amounts.

## 9. Protected multiplayer boundary

The `/game-online` implementation is locked. Spin Wheel work must not modify the protected online multiplayer page or its styles.

## 10. Rebuild rule

When the Spin Wheel contract changes, rebuild the affected Spin Wheel surfaces around the single server configuration source. Do not reintroduce a second reward table, client-selected payout logic, or independent wheel configuration.
