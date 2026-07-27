import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

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
    },
  });

  return NextResponse.json({ id: user.id, coins: user.coins, gems: user.gems });
}