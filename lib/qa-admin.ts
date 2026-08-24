import { NextRequest } from "next/server";
import { currentUser } from "./auth-session";

/** Server-side authorization for developer QA tooling. */
export async function requireQaAdmin(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return null;
  // Admin capability is intentionally server-side. Existing admin accounts can
  // be granted this capability through the database without exposing an email
  // or secret in client code.
  if (user.is_admin === true || user.role === "admin") return user;
  return null;
}
