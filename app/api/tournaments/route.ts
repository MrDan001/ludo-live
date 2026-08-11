import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

// GET /api/tournaments - list open tournaments (default) or filter by status
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "open";

  const tournaments = await prisma.tournament.findMany({
    where: { status },
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