# Admin Shop — Live Pricing Indicator

The Admin Shop UI is `app/dbase/AdminShop.tsx` and its authoritative API is `app/api/admin/shop/route.ts`.

## Indicator

The Admin Shop displays:

- **Live pricing** status.
- **Last updated** timestamp for the most recent persisted pricing override.
- A manual **Refresh** action that reloads the authoritative server catalogue.

The timestamp is returned by the Admin Shop API as `lastUpdated`, calculated from `MAX(updated_at)` in `ludo_shop_catalog_overrides`.

After a successful price/currency save, the API returns the new `lastUpdated` value and the UI updates the indicator immediately.

## Source of truth

The indicator is informational only. The authoritative price and currency remain the PostgreSQL override catalogue used by both the player Shop and purchase APIs.

Do not use the browser timestamp or local state as a pricing source of truth.

## Caching

The Admin Shop GET response is explicitly sent with no-cache headers so the indicator and pricing data represent the current database state.
