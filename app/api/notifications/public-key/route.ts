import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // The public key is safe to return to the browser. Prefer the documented
  // NEXT_PUBLIC_ variable, but fall back to the server-side public-key copy so
  // deployments don't fail solely because the public env alias is missing.
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  return NextResponse.json({ publicKey: key });
}
