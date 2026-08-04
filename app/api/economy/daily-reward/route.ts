import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const HOURS_BETWEEN_CLAIMS = 20; // slight grace window under 24h
const STREAK_BREAK_HOURS = 48;

// Single source of truth for the 7-day reward cycle - both GET (status,
// for rendering the grid) and POST (actually paying out) read from this,
// so the UI and the payout can never drift apart.
export const REWARD_SCHEDULE = [
  { day: 1, coins: 1000, gems: 0 },
  { day: 2, coins: 1500, gems: 0 },
  { day: 3, coins: 0, gems: 5 },
  { day: 4, coins: 2000, gems: 0 },
  { day: 5, coins: 0, gems: 10 },
  { day: 6, coins: 3000, gems: 0 },
  { day: 7, coins: 5000, gems: 20 },
];

interface DailyRewardRecord {
  lastClaim: Date | null;
  streak: number;
}

function computeStatus(record: DailyRewardRecord | null, now: Date) {
  const claimedToday =
    !!record?.lastClaim &&
    now.getTime() - record.lastClaim.getTime() < HOURS_BETWEEN_CLAIMS * 60 * 60 * 1000;

  const isStreakContinuing =
    !!record?.lastClaim &&
    now.getTime() - record.lastClaim.getTime() < STREAK_BREAK_HOURS * 60 * 60 * 1000;

  if (claimedToday) {
    // Already claimed - show the day that was just claimed, and when the
    // next one unlocks.
    const day = ((record!.streak - 1) % 7) + 1;
    const nextAvailable = new Date(record!.lastClaim!.getTime() + HOURS_BETWEEN_CLAIMS * 60 * 60 * 1000);
    return { claimedToday: true, currentDay: day, streak: record!.streak, nextAvailable };
  }

  // Not claimed today - show the day that *would* be claimed next.
  const upcomingStreak = isStreakContinuing ? (record?.streak ?? 0) + 1 : 1;
  const day = ((upcomingStreak - 1) % 7) + 1;
  return { claimedToday: false, currentDay: day, streak: record?.streak ?? 0, nextAvailable: null };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const record = await prisma.dailyReward.findUnique({ where: { userId } });
  const status = computeStatus(record, new Date());

  return NextResponse.json({ ...status, rewards: REWARD_SCHEDULE });
}

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const record = await prisma.dailyReward.findUnique({ where: { userId } });
  const now = new Date();
  const status = computeStatus(record, now);

  if (status.claimedToday) {
    return NextResponse.json({ claimed: false, nextAvailable: status.nextAvailable });
  }

  const isStreakContinuing =
    !!record?.lastClaim && now.getTime() - record.lastClaim.getTime() < STREAK_BREAK_HOURS * 60 * 60 * 1000;
  const newStreak = isStreakContinuing ? (record?.streak ?? 0) + 1 : 1;
  const dayIndex = (newStreak - 1) % 7;
  const reward = REWARD_SCHEDULE[dayIndex];

  await prisma.dailyReward.upsert({
    where: { userId },
    update: { lastClaim: now, streak: newStreak },
    create: { userId, lastClaim: now, streak: newStreak },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      coins: { increment: reward.coins },
      gems: { increment: reward.gems },
    },
  });

  return NextResponse.json({
    claimed: true,
    day: reward.day,
    coins: reward.coins,
    gems: reward.gems,
    streak: newStreak,
  });
}