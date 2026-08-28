# Ludo Live — Shop Pricing Contract

This document records the authoritative Shop pricing implementation so future developers do not guess how Admin Shop pricing works.

## One authoritative catalogue

`lib/customization-catalog.ts` contains the defaults. `app/api/shop/catalog.ts` merges `ludo_shop_catalog_overrides` from PostgreSQL and returns the effective catalogue.

The Admin Shop can change **both price and payment currency** for currency packages and customization products. Supported payment currencies are:

- `coins`
- `gems`
- `naira`

The override is keyed by `(item_type,item_id)` and is the source of truth for both display and purchase validation.

## Player Shop categories

The Player Shop includes:

- Coins
- Gems
- Items
- Avatars
- Boards
- Dice
- **Yards**

### Yards category

**Yards is one shared cosmetic category.** It must contain both:

1. **Background Yards** — full artwork covering the existing white inner yard.
2. **Backgroundless Yard Stickers** — transparent artwork placed inside the existing white yard.

Do not create a separate public Shop category for backgroundless stickers. They are still yard cosmetics and use the same `item` purchase/ownership/equip path.

Current built-in yard product IDs use the `yard-` namespace. Backgroundless stickers use IDs such as `yard-sticker-crown`, `yard-sticker-neon`, `yard-sticker-dragon`, `yard-sticker-panda`, `yard-sticker-sakura`, and `yard-sticker-bolt`.

Yard equipment is a single slot. Equipping one `yard-*` item replaces the previously equipped yard cosmetic, regardless of whether it is a full background or a backgroundless sticker.

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

## Admin and yard-sticker creation

The existing Avatar Management screen creates `avatar` products. It does **not** currently create yard stickers.

The intended production Admin workflow for dynamic yard stickers is documented in `docs/YARD_COSMETICS.md`:

1. Admin chooses **Yard**.
2. Admin chooses **Backgroundless Sticker**.
3. Admin uploads transparent PNG/WebP artwork.
4. The server validates the artwork and preserves transparency.
5. Admin previews it across all four yards.
6. Admin sets name, description, rarity, price and currency.
7. Admin publishes it.
8. The product enters the same `item` catalogue and normal purchase/ownership/equip flow.

A future implementation must not require editing React source code or hard-coded SVG constants to release a sticker.

## Player Shop

`app/shop/page.tsx` loads the effective server catalogue through `/api/customization` and `/api/shop/catalog` and renders the returned price/currency for all supported product categories.

The player Shop must never use a hard-coded product price as the final displayed price after the server catalogue has loaded.

## Premium and Elite Avatars

The avatar catalogue includes the existing avatar catalogue and any database-managed avatar records. Avatar artwork is governed by `docs/AVATAR_CATALOGUE.md` and must not be confused with yard-sticker artwork.

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

Yard backgrounds and backgroundless yard stickers are both customization `item` products. Do not move them into the avatar product system merely because both contain artwork.

Do not move purchased currency packages into Inventory or Award Room; they change wallet balances only.

## Change discipline

If product IDs, default prices, supported currencies, payment behavior, fulfillment, XP rules, yard-cosmetic types, artwork storage, or Admin sticker workflow change, update `docs/YARD_COSMETICS.md`, `ARCHITECTURE.md`, and `DEVELOPER_HANDOFF.md` together with this document.
