import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

// GET /api/tournaments - list open tournaments (default) or filter by status
// GET /api/tournaments?userId=... - "my tournaments" mode: instead of every
// open tournament, return only the ones this user has personally entered
// (open or in_progress by default, so a client can poll this to notice the
// moment their tournament fills up and get its roomId to join the match).
// Pass an explicit ?status= alongside userId to narrow further (e.g.
// status=completed to look up a past result).
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const statusParam = req.nextUrl.searchParams.get("status");

  const where = userId
    ? {
        entries: { some: { userId } },
        ...(statusParam ? { status: statusParam } : { status: { in: ["open", "in_progress"] } }),
      }
    : { status: statusParam ?? "open" };

  const tournaments = await prisma.tournament.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });

  return NextResponse.json({
    tournaments: tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      entryFee: t.entryFee,
      prizePool: t.prizePool,
      maxPlayers: t.maxPlayers,
      playerCount: t._count.entries,
      status: t.status,
      roomId: t.roomId,
      winnerId: t.winnerId,
      matchId: t.matchId,
      createdAt: t.createdAt,
    })),
  });
}

// POST /api/tournaments - create a new tournament
// Body: { name: string, entryFee: number, maxPlayers?: number }
// entryFee and maxPlayers are coins/counts only - there is no real-money
// field anywhere in this route. Do not add one without a legal review.
export async function POST(req: NextRequest) {
  const { name, entryFee, maxPlayers } = await req.json();

  if (!name || typeof entryFee !== "number" || entryFee < 0) {
    return NextResponse.json(
      { error: "name and a non-negative entryFee (coins) are required" },
      { status: 400 }
    );
  }

  const tournament = await prisma.tournament.create({
    data: {
      name,
      entryFee: Math.floor(entryFee),
      maxPlayers: maxPlayers && maxPlayers >= 2 ? Math.floor(maxPlayers) : 4,
    },
  });

  return NextResponse.json({ tournament });
}