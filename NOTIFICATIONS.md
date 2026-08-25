# Ludo Live — Push Notification Contract

## Purpose

Ludo Live uses browser Web Push so supported devices can receive notifications while the app is backgrounded or closed, similar to an installed app.

## Required onboarding

For authenticated users, notification setup is a required app capability. `app/_components/NotificationGate.tsx` is mounted from `app/layout.tsx` and blocks the authenticated app until the browser/device has granted notification permission and a PushSubscription has been registered with the server.

Browsers and operating systems control permission. The application cannot silently grant OS/browser permission. If permission has previously been denied, the user must enable notifications in browser/device settings before continuing.

## Browser requirements

- Secure context (`HTTPS`).
- `Notification`, `ServiceWorker`, and `PushManager` support.
- A registered `/sw.js` service worker.
- Web Push support on the user's browser/device.
- iOS/iPadOS may require the site to be installed as a Home Screen web app before web push is available.

## Client flow

1. `ServiceWorkerRegistration` registers `/sw.js` for `/`.
2. `NotificationGate` checks the current authenticated session's subscription state.
3. If notifications are not enabled, the gate requests browser permission from the user.
4. The client fetches `/api/notifications/public-key`.
5. The browser creates a `PushSubscription` with the VAPID public key.
6. The subscription is sent to `/api/notifications/subscribe`.
7. PostgreSQL stores the subscription against the authenticated `ludo_users.id`.
8. Existing subscriptions are updated by endpoint; stale subscriptions are removed after delivery returns 404/410.

## Server authority

- `app/api/notifications/subscribe/route.ts` owns subscription registration/status/removal.
- Identity comes from the `ludo_session` cookie; never accept a client-supplied user id.
- `ludo_push_subscriptions` is the persistent subscription table.
- `lib/pushNotifications.ts` is the server-side delivery helper.
- The helper uses `web-push` and VAPID to send encrypted Web Push payloads.

## Required Railway variables

The production `ludo-live` service must have:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — safe to expose to the browser.
- `VAPID_PUBLIC_KEY` — server copy of the public key.
- `VAPID_PRIVATE_KEY` — **secret; never commit to GitHub or expose to the browser**.
- `VAPID_SUBJECT` — normally a `mailto:` address or HTTPS contact URL.

The VAPID key pair must be generated once and retained. Do not generate a new pair during every deploy, because changing the pair invalidates the relationship with existing subscriptions.

## Service worker behavior

`public/sw.js` handles:

- `push` events by displaying the notification.
- `notificationclick` by opening/focusing the supplied application URL.
- Network-only handling for API, Next.js and Socket.IO traffic.

Payload shape:

```json
{
  "title": "Ludo Live",
  "body": "Your tournament is starting.",
  "url": "/tournament",
  "tag": "tournament-start"
}
```

## Product integration

Any server-side event that should notify a player should call `sendPushToUser(userId, payload)` from `lib/pushNotifications.ts` after the authoritative database mutation succeeds.

Examples include:

- Friend request / acceptance.
- Room invitation.
- Tournament start/result.
- Mission reward available/claimed.
- Reward or free-spin grant.
- Important account/security events.

Do not send a push from client-only state. The server event remains authoritative.

## Security rules

- Never expose `VAPID_PRIVATE_KEY` to the browser.
- Never commit VAPID private keys.
- Never trust a client user id when registering or sending notifications.
- Remove expired subscriptions after 404/410 delivery responses.
- Do not bypass browser/OS notification permission controls.

## Documentation rule

When notification behavior, subscription storage, required onboarding, service-worker behavior, or environment variables change, update this file and the project's main architecture/handoff documentation in the same change.
