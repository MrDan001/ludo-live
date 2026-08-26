# Ludo Live Avatar Catalogue

## Production architecture

Avatars are a single database-backed catalogue. The application no longer depends on a committed avatar atlas or hard-coded artwork paths.

**Admin → PostgreSQL avatar record → Shop → purchase → owned inventory → equip → profile/game**

The six baseline avatars are seeded into `ludo_shop_avatars` as protected built-in records. New artwork is never committed to Git.

## Admin workflow

Open `/dbase/avatars` or use **DBASE → Management → Avatars** as an authorized administrator.

### Create

1. Choose PNG, JPEG, or WebP artwork.
2. Artwork may use any aspect ratio and is automatically prepared into the square avatar canvas without cropping.
3. The complete source artwork is fitted inside the canvas with transparent padding where necessary.
4. Source artwork must have a longest side of at least 128px and no more than 2048px, and the prepared file must be no larger than 1.5 MB.
5. Enter name and description.
6. Select a category and rarity.
7. Set price and currency: Naira, Coins, or Gems.
8. Publish.

Admins do **not** need to manually crop artwork before uploading it.

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

The browser prepares non-square artwork before upload by fitting the entire source image into a square canvas; it does not crop the source. The server then validates the resulting PNG/JPEG/WebP payload, file size, and square dimensions before storage. Generated UUID-based IDs are used instead of filenames. Replacing artwork keeps the same avatar ID and therefore preserves ownership/equipping references. Deleting an uploaded avatar deletes its stored artwork with the database row.

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

The same avatar ID is used by Shop, Inventory, profile/game avatar rendering, purchase, and equip flows. Managed artwork is rendered through `ShopItemArtwork`/`EquippedAvatar` with `object-fit: contain` and a resilient icon fallback if an image becomes unavailable. The renderer must not crop managed avatar artwork.

## Legacy cleanup

The obsolete avatar atlas and premium/elite sprite assets were removed from the repository before this architecture was introduced. Do not reintroduce `AvatarArtwork`, atlas paths, or filename-based avatar lookup.

The legacy six-avatar constants are no longer used to populate the Shop; the six baseline records are seeded into the database instead.

## Adding a new avatar

No code change is required.

1. Open Avatar Management.
2. Create or select the category.
3. Upload valid PNG, JPEG, or WebP artwork in any aspect ratio.
4. Let Avatar Management automatically fit the complete artwork without cropping.
5. Enter the avatar metadata and price.
6. Publish.
7. Verify it appears in Shop with the complete artwork visible.
8. Buy it with a test account.
9. Verify it appears in Inventory.
10. Equip it.
11. Verify the artwork appears in profile/game surfaces.

## Verification checklist

- `/dbase/avatars` loads for an admin.
- Create validates artwork before database insertion.
- Portrait, landscape, and square source artwork are accepted.
- Source artwork is fitted without cropping.
- Replacement artwork keeps the avatar ID.
- Hidden avatars disappear from the public Shop.
- Deleted uploaded avatars disappear and their binary data is removed with the row.
- The six built-in avatars remain available as database records.
- Shop displays managed artwork with the complete image visible and has a broken-image fallback.
- Inventory displays the same managed artwork.
- Equip uses the canonical avatar ID.
- Non-avatar shop items, wallet, notifications, and multiplayer logic remain on their existing paths.
- Railway production deployment remains healthy after each release.
