# Ludo Live — Shop Pricing Contract

This document records the currency-package implementation so future developers do not guess how Admin Shop pricing works.

## Currency packages

The shared Shop catalogue contains two first-class package types:

- `coin_package` — awards Coins.
- `gem_package` — awards Gems.

The catalogue is `lib/customization-catalog.ts` and is consumed by `app/api/shop/catalog.ts` and the Admin Shop API.

## Default packages

### Coin packages

- 500 Coins — 25 Gems
- 1,000 Coins — 50 Gems
- 2,000 Coins — 100 Gems
- 4,000 Coins — 200 Gems
- 8,000 Coins — 400 Gems
- 15,000 Coins — 800 Gems
- 20,000 Coins — 1,000 Gems

### Gem packages

- 50 Gems — ₦1,000
- 100 Gems — ₦1,500
- 200 Gems — ₦2,500
- 400 Gems — ₦4,000
- 500 Gems — ₦5,000
- 1,000 Gems — ₦8,000
- 1,500 Gems — ₦10,000

These are defaults only. Admin price overrides are authoritative.

## Admin pricing

Admin Shop can change the **price and payment currency** of a package to:

- `coins`
- `gems`
- `naira`

The override is stored in `ludo_shop_catalog_overrides` by `(item_type,item_id)`.

Do not create a second package-price table or hard-code a different price source in the player Shop.

## Player Shop

`app/api/shop/catalog.ts` merges Admin overrides into the shared catalogue.

`app/api/shop/catalog/route.ts` exposes the effective package catalogue to the authenticated/player Shop UI.

The player Shop must display the effective Admin-configured price/currency and send the package type/id to the server. It must never decide the final price itself.

## Purchase paths

### Coins/Gems price

`app/api/shop/purchase/route.ts` validates the package from the shared catalogue, checks the selected wallet balance, performs the wallet mutation in a database transaction, and grants the package reward.

### Naira price

`app/api/paystack/initialize/route.ts` reads the effective package price from the shared catalogue and initializes Paystack with that amount.

`app/api/paystack/callback/route.ts` verifies the Paystack transaction and only then credits the configured package reward.

Never credit a Naira package because the browser claims payment succeeded.

## XP rule

A successful Gem purchase awards **+15 XP**, including Gem packages purchased through the internal wallet path or verified Naira checkout. Coin packages do not award the diamond-purchase XP bonus.

## Important boundary

Customization items (boards, dice, avatars and shop items) remain distinct from currency packages. They share the authoritative pricing override mechanism but retain their existing ownership/equip fulfilment path.

Do not move purchased currency packages into Inventory or Award Room; they change wallet balances only.

## Change discipline

If package IDs, package amounts, supported currencies, payment behavior or XP rules change, update this document together with `ARCHITECTURE.md` and `DEVELOPER_HANDOFF.md`.
