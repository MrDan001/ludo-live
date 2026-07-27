import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const entries = await prisma.leaderboardEntry.findMany({
    orderBy: { wins: "desc" },
    take: 20,
  });

  const userIds = entries.map((e) => e.userId);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard = entries.map((e) => ({
    name: userMap.get(e.userId)?.name ?? "Unknown",
    wins: e.wins,
    gamesPlayed: e.gamesPlayed,
  }));

  return NextResponse.json({ leaderboard });
}