import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

// No avatar upload flow exists yet, so give every user a stable, unique
// generated avatar (seeded on their id) until real profile pictures land.
function defaultAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export async function POST(req: NextRequest) {
  const { supabaseId, name, email, isGuest } = await req.json();
  if (!supabaseId) return NextResponse.json({ error: "supabaseId required" }, { status: 400 });

  const user = await prisma.user.upsert({
    where: { supabaseId },
    update: { name: name || "Player" },
    create: {
      supabaseId,
      name: name || "Player",
      email: email || null,
      isGuest: !!isGuest,
      avatarUrl: defaultAvatarUrl(supabaseId),
    },
  });

  const avatarUrl = user.avatarUrl || defaultAvatarUrl(user.id);

  return NextResponse.json({ id: user.id, coins: user.coins, gems: user.gems, avatarUrl });
}