"use client";

/**
 * Global app shell.
 *
 * The account/guest landing page lives at `/` and must be the first screen
 * users see. The actual game home is `/home`, reached only after the user
 * chooses Create Account, Sign In, social sign-in, or Continue as Guest.
 *
 * Keep this wrapper intentionally transparent so it cannot replace the root
 * landing page with the legacy home screen.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
