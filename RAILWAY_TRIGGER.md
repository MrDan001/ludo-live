# Railway Deployment Contract

This file is documentation only. It does not contain Ludo application code.

## Production flow

`main` → GitHub → connected Railway service.

A commit being pushed to GitHub does **not** mean the application is live.

## Required verification

For every production change:

1. Confirm the intended commit is on `main`.
2. Confirm Railway picked up that commit.
3. Inspect build/deploy logs.
4. If the deployment fails, fix the exact reported error and redeploy.
5. Only report the feature as live after Railway reports `SUCCESS`.

## Failure discipline

- Do not guess the cause of a Railway failure.
- Do not make unrelated code changes while debugging a failed build.
- Do not suppress TypeScript/build checks to force a deployment through.
- Treat the last known successful deployment as the safe production baseline while debugging.

## Product documentation

The complete architecture and product contracts live in:

- `ARCHITECTURE.md`
- `DEVELOPER_HANDOFF.md`

Those documents are the source of developer-facing product rules for gameplay, XP, Shop, Inventory/Award Room, admin navigation, finance responsiveness, authentication, server authority and deployment discipline.
