# Ludo Live — Yard Cosmetics

## Purpose

Yard cosmetics customize the four white player yards without changing the canonical Ludo board geometry or gameplay rules.

The player-facing **Yards** Shop category is one shared category for two cosmetic presentation types:

1. **Background Yards** — artwork fills the existing white yard area.
2. **Backgroundless Yard Stickers** — transparent artwork is placed inside the existing white yard without painting a rectangle behind it.

Both are `item` cosmetics and use the normal Shop purchase/ownership/equip path.

## Rendering contract

`app/_components/YardSkinOverlay.tsx` is the canonical yard-cosmetic renderer.

### Background yards

A background yard covers only the existing inner white yard. It must not cover the path, center finish area, or the rest of the board.

Examples include:

- Inferno
- Galaxy
- Royal
- Ocean
- Sakura
- Shadow
- Neon

### Backgroundless stickers

A backgroundless sticker is transparent artwork. It must preserve transparency and must not introduce a solid rectangular background.

The sticker is rendered once in each of the four yards at a consistent relative position and size. The artwork should be designed with transparent padding where appropriate so it does not obscure the four token positions unnecessarily.

The current built-in sticker IDs are:

- `yard-sticker-crown`
- `yard-sticker-neon`
- `yard-sticker-dragon`
- `yard-sticker-panda`
- `yard-sticker-sakura`
- `yard-sticker-bolt`

## Shop category

The player Shop exposes a **Yards** category. It must contain both background yards and backgroundless stickers. Do not create a separate player category for stickers.

All yard cosmetics remain normal `item` products so existing purchase, ownership and equipment persistence continue to work.

Yard equipment uses one slot: equipping a new `yard-*` item automatically replaces the previously equipped yard cosmetic. This applies equally to full backgrounds and backgroundless stickers.

## Admin workflow

### Current implementation

The currently shipped background yards and stickers are built-in catalogue records in `app/api/shop/catalog.ts`, while their visual artwork is defined by the yard renderer. This means **an administrator cannot currently upload a new backgroundless sticker through the Admin UI** without a code/catalogue change.

Do not tell an administrator that the existing Avatar Management screen can create yard stickers. Avatar Management creates `avatar` products, while yard cosmetics are `item` products.

### Required admin-upload design

When dynamic yard-sticker management is implemented, the Admin Shop/yard management flow should support:

1. Open the Admin Shop/Yard management screen.
2. Choose **Yard** as the product family.
3. Choose **Backgroundless Sticker** as the presentation type.
4. Upload transparent PNG or WebP artwork.
5. Validate that the source contains an alpha channel and meets the configured dimensions/file-size limits.
6. Preview the sticker on all four yards before publishing.
7. Enter name, description, rarity, price and currency.
8. Publish.
9. The server creates a stable yard-item ID and stores the artwork in the authoritative product store.
10. The player Shop receives the item through the same catalogue endpoint used by other customization items.

The admin must not need to edit React source code, SVG constants, or hard-coded item arrays to release a new sticker.

## Data and authority

- Product type: `item`.
- Yard item IDs use the `yard-` namespace.
- Ownership is stored in the user's `owned_items` collection.
- Equipment is stored in `equipped_items` and only one `yard-*` item may be equipped at a time.
- `/api/customization` is authoritative for owned/equipped yard state.
- `/api/shop/catalog` is authoritative for Shop pricing/catalogue data.
- Naira purchases must use the existing verified payment path.

Do not create a separate yard wallet, ownership table, or client-only purchase state merely for stickers.

## Artwork requirements

### Background yard

- May be opaque or visually complete.
- Must be confined to the inner yard.
- Must not alter board/path geometry.

### Backgroundless sticker

- PNG or WebP with real transparency is preferred.
- No baked white rectangle.
- Artwork should remain visually recognizable when scaled to the yard.
- Transparent margins are allowed and can be used to control visual breathing room around the token positions.

## Compatibility

A yard cosmetic is presentation-only. It must not change:

- token positions
- legal moves
- safe-square rules
- capture rules
- finish position `57`
- multiplayer ownership/team mapping
- bot behavior
- tournament rules

## Developer checklist

Before releasing a yard-cosmetic change:

- Verify the item appears under **Yards** with other yard cosmetics.
- Verify purchase uses the normal server-authoritative Shop path.
- Verify ownership persists after refresh/login.
- Verify equipping replaces the previous `yard-*` cosmetic.
- Verify all four yards render the same cosmetic.
- Verify backgroundless artwork has no rectangular background.
- Verify token positions remain usable and visible.
- Verify the board/path/center are not covered.
- Verify Railway reports `SUCCESS` before considering the change live.
