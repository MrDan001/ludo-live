# Ludo Live Avatar Catalogue

## Purpose

The avatar catalogue is database-backed for administrator-created artwork. The six built-in avatars remain available as a safe baseline, while uploaded avatars can be added without a code deployment.

## Admin workflow

Open `/dbase/avatars` as an authorized administrator.

1. Choose a PNG, JPEG, or WebP image up to 1.5 MB.
2. Enter the avatar name and optional description.
3. Choose a category and rarity.
4. Set the price and choose exactly one currency: Naira, Coins, or Gems.
5. Publish the avatar.
6. Use the manager to hide, recategorize, or delete uploaded avatars.

## Storage architecture

Avatar metadata is stored in PostgreSQL in `ludo_shop_avatars`. Artwork bytes are stored with the avatar record and are served through `/api/shop/avatars/:id/image`. This avoids committing binary artwork to Git and gives every avatar a stable application URL.

The catalogue API returns `imageUrl` only for published database avatars. The player Shop renders that URL with a transparent `object-contain` image; built-in avatars continue to use their icon fallback.

## Categories

Default categories are seeded once:

- Classic
- Heroes
- Royal
- Fantasy
- Sports
- Funny
- Animals
- Seasonal
- Limited Edition

Category records are separate from avatar records so category names and activation can evolve without rewriting avatar artwork.

## Pricing

Allowed currencies are `naira`, `coins`, and `gems`. Prices are stored as non-negative integer values. Existing Shop price overrides continue to apply to the non-avatar static catalogue.

Naira is intentionally not charged by the normal customization purchase endpoint. It remains a checkout/payment flow and must be wired to the application's payment provider before a Naira avatar can be purchased.

## Safety rules

- Do not commit uploaded avatar binaries to the repository.
- Keep the 1.5 MB server-side image limit.
- Accept only PNG, JPEG, and WebP MIME types.
- Keep image serving restricted to published avatars.
- Use generated avatar IDs; never use the filename as an identifier.
- Record avatar create/update/delete actions in the admin audit table.
- Do not reintroduce the removed atlas, premium/elite image set, or `AvatarArtwork` legacy path.

## Verification checklist

After a deployment, verify:

- `/dbase/avatars` loads for an admin.
- Uploading an image creates a database avatar.
- The image URL returns the stored image.
- The avatar appears in the player Shop after publishing.
- Buy/equip uses the same avatar ID returned by the catalogue.
- Hiding an avatar removes it from the public Shop.
- Deleting an avatar removes its database artwork.
- Existing six built-in avatars still render.
- Non-avatar Shop items and notifications are unaffected.
