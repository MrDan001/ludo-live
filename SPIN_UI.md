# Spin Wheel UI

## Server time

The Spin Wheel displays the authoritative time returned by `/api/spin` and renders it as **GMT +1**. The active-play bonus is presented as `17:00–20:00 server time (GMT +1)` rather than naming a country or local timezone.

The API response includes `serverTime` so the client does not have to guess the server clock. The client advances that timestamp locally between refreshes.

## Available spins placement

The available-spin indicator is intentionally rendered **below the Spin Now button**. It must not be placed above the wheel/button as a primary status control.

## Change discipline

If the Spin Wheel's server-time source, GMT+1 presentation, active-play window, or available-spin placement changes, update this document with the UI change.
