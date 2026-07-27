import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const REWARD_AMOUNT = 100;
const HOURS_BETWEEN_CLAIMS = 20; // slight grace window under 24h

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let record = await prisma.dailyReward.findUnique({ where: { userId } });

  const now = new Date();
  const canClaim =
    !record?.lastClaim ||
    now.getTime() - record.lastClaim.getTime() > HOURS_BETWEEN_CLAIMS * 60 * 60 * 1000;

  if (!canClaim) {
    const nextAvailable = new Date(
      record!.lastClaim!.getTime() + HOURS_BETWEEN_CLAIMS * 60 * 60 * 1000
    );
    return NextResponse.json({ claimed: false, nextAvailable });
  }

  const isStreakContinuing =
    record?.lastClaim &&
    now.getTime() - record.lastClaim.getTime() < 48 * 60 * 60 * 1000;

  const newStreak = isStreakContinuing ? (record?.streak ?? 0) + 1 : 1;

  await prisma.dailyReward.upsert({
    where: { userId },
    update: { lastClaim: now, streak: newStreak },
    create: { userId, lastClaim: now, streak: 1 },
  });

  const bonusForStreak = Math.min(newStreak * 10, 100);
  const totalReward = REWARD_AMOUNT + bonusForStreak;

  await prisma.user.update({
    where: { id: userId },
    data: { coins: { increment: totalReward } },
  });

  return NextResponse.json({ claimed: true, amount: totalReward, streak: newStreak });
}