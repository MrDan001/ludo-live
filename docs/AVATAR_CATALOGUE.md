# Ludo Live Avatar Catalogue

## Production architecture

Avatars are a single database-backed catalogue. The application no longer depends on a committed avatar atlas or hard-coded artwork paths.

**Admin → PostgreSQL avatar record → Shop → purchase → owned inventory → equip → profile/game**

The six baseline avatars are seeded into `ludo_shop_avatars` as protected built-in records. New artwork is never committed to Git.

## Admin workflow

Open `/dbase/avatars` or use **DBASE → Management → Avatars** as an authorized administrator.

### Create

1. Choose PNG, JPEG, or WebP artwork.
2. Artwork must be square, 128–2048px, and no larger than 1.5 MB.
3. Enter name and description.
4. Select a category and rarity.
5. Set price and currency: Naira, Coins, or Gems.
6. Publish.

### Manage

Admins can:

- Edit name and description.
- Change category, rarity, price, and currency.
- Replace artwork without changing the avatar ID.
- Publish/hide an avatar.
- Reorder catalogue items.
- Delete uploaded avatars.
- Manage categories and their active state.

The six protected built-ins cannot be permanently deleted; they can be hidden if the product requires that behaviour.

## Storage

Artwork is stored as binary data with the avatar record in PostgreSQL and served through a stable application URL:

`/api/shop/avatars/:id/image`

The server validates MIME type, file size, and square dimensions before storage. Generated UUID-based IDs are used instead of filenames. Replacing artwork keeps the same avatar ID and therefore preserves ownership/equipping references. Deleting an uploaded avatar deletes its stored artwork with the database row.

Image responses are cache-safe for replacements and include `X-Content-Type-Options: nosniff`.

## Categories

The seeded catalogue includes:

- Classic
- Heroes
- Royal
- Fantasy
- Sports
- Animals
- Funny
- Seasonal
- Limited Edition

Categories are separate database records. Hiding a category removes its avatars from the public catalogue without rewriting avatar ownership data.

## Player rendering

The same avatar ID is used by Shop, Inventory, profile/game avatar rendering, purchase, and equip flows. Managed artwork is rendered through `ShopItemArtwork`/`EquippedAvatar` with a resilient icon fallback if an image becomes unavailable.

## Legacy cleanup

The obsolete avatar atlas and premium/elite sprite assets were removed from the repository before this architecture was introduced. Do not reintroduce `AvatarArtwork`, atlas paths, or filename-based avatar lookup.

The legacy six-avatar constants are no longer used to populate the Shop; the six baseline records are seeded into the database instead.

## Adding a new avatar

No code change is required.

1. Open Avatar Management.
2. Create or select the category.
3. Upload valid square artwork.
4. Enter the avatar metadata and price.
5. Publish.
6. Verify it appears in Shop.
7. Buy it with a test account.
8. Verify it appears in Inventory.
9. Equip it.
10. Verify the artwork appears in profile/game surfaces.

## Verification checklist

- `/dbase/avatars` loads for an admin.
- Create validates artwork before database insertion.
- Replacement artwork keeps the avatar ID.
- Hidden avatars disappear from the public Shop.
- Deleted uploaded avatars disappear and their binary data is removed with the row.
- The six built-in avatars remain available as database records.
- Shop displays managed artwork and has a broken-image fallback.
- Inventory displays the same managed artwork.
- Equip uses the canonical avatar ID.
- Non-avatar shop items, wallet, notifications, and multiplayer logic remain on their existing paths.
- Railway production deployment remains healthy after each release.
