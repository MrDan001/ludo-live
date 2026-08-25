# Ludo Live — Shop Pricing Contract

This document records the authoritative Shop pricing implementation so future developers do not guess how Admin Shop pricing works.

## One authoritative catalogue

`lib/customization-catalog.ts` contains the defaults. `app/api/shop/catalog.ts` merges `ludo_shop_catalog_overrides` from PostgreSQL and returns the effective catalogue.

The Admin Shop can change **both price and payment currency** for currency packages and customization products. Supported payment currencies are:

- `coins`
- `gems`
- `naira`

The override is keyed by `(item_type,item_id)` and is the source of truth for both display and purchase validation.

## Currency packages

The shared catalogue contains:

- `coin_package` — awards Coins.
- `gem_package` — awards Gems.

Default packages are only fallbacks. Admin overrides replace their price/currency.

### Default Coin packages

- 500 Coins — 25 Gems
- 1,000 Coins — 50 Gems
- 2,000 Coins — 100 Gems
- 4,000 Coins — 200 Gems
- 8,000 Coins — 400 Gems
- 15,000 Coins — 800 Gems
- 20,000 Coins — 1,000 Gems

### Default Gem packages

- 50 Gems — ₦1,000
- 100 Gems — ₦1,500
- 200 Gems — ₦2,500
- 400 Gems — ₦4,000
- 500 Gems — ₦5,000
- 1,000 Gems — ₦8,000
- 1,500 Gems — ₦10,000

## Player Shop

`app/shop/page.tsx` loads the effective server catalogue through `/api/customization` and `/api/shop/catalog` and renders the returned price/currency for:

- Coins
- Gems
- Items
- Avatars
- Boards
- Dice

The player Shop must never use a hard-coded product price as the final displayed price after the server catalogue has loaded.

## Premium and Elite Avatars

The avatar catalogue now includes 10 `PREMIUM` avatars and 20 `ELITE` avatars in addition to the original six avatars.

- Premium IDs: `premium-01` through `premium-10`.
- Elite IDs: `elite-01` through `elite-20`.
- All 30 new avatars use Gems by default and have deliberately higher demo prices than the existing avatar tier.
- Artwork is stored in `public/avatars/premium-elite-atlas.svg` and referenced by `atlas:01` through `atlas:30` catalog icons.
- The atlas is presentation-only; ownership, equipping and purchase authority remain the existing customization system.
- Admin can change the price **and payment currency** of every avatar from `/dbase` → Shop Pricing. No avatar price is hard-coded as the final purchase price.

## Purchase authority

`app/api/shop/purchase/route.ts` reads currency-package pricing from `getShopItem()` at purchase time. It does not trust a browser-supplied price.

`app/api/customization/route.ts` likewise reads the effective Admin override at purchase time for boards, dice, avatars and items. For `coins` or `gems`, the selected wallet is debited transactionally. For `naira`, the item must go through the verified Paystack item checkout rather than a client-side wallet mutation.

`app/api/paystack/initialize/route.ts` handles Naira currency packages from the effective catalogue.

`app/api/paystack/shop-item/route.ts` handles Naira customization products from the effective catalogue.

`app/api/paystack/callback/route.ts` verifies Paystack before crediting/fulfilling the purchase. Never trust a browser claim that a Naira payment succeeded.

## Audit / wallet

Wallet-changing purchases remain server-authoritative and are recorded in the existing admin wallet ledger. Do not introduce a second price or wallet source.

## XP rule

A successful Gem purchase awards **+15 XP**, including Gem packages purchased through the internal wallet path or verified Naira checkout. Coin packages do not receive the diamond-purchase XP bonus.

## Important boundary

Customization products and currency packages are distinct product types, but they share the same authoritative pricing override mechanism.

Do not move purchased currency packages into Inventory or Award Room; they change wallet balances only.

## Change discipline

If product IDs, default prices, supported currencies, payment behavior, fulfillment, or XP rules change, update this document together with `ARCHITECTURE.md` and `DEVELOPER_HANDOFF.md`.
