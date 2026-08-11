import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

// POST /api/tournaments/[id]/join
// Body: { userId: string }
//
// The entry fee is deducted server-side inside a transaction, using an
// atomic "coins >= entryFee" guard on the update itself (not a
// read-then-write check), so two simultaneous join requests from a low
// balance can't both succeed. The client never sends a coin amount -
// it only ever sends the userId; the fee is looked up from the
// tournament row.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: { _count: { select: { entries: true } } },
      });

      if (!tournament) throw new Error("NOT_FOUND");
      if (tournament.status !== "open") throw new Error("NOT_OPEN");
      if (tournament._count.entries >= tournament.maxPlayers) throw new Error("FULL");

      // Atomic conditional deduct: only succeeds if the user still has
      // enough coins at the moment this runs, regardless of what any
      // earlier read in this request said.
      const deducted = await tx.user.updateMany({
        where: { id: userId, coins: { gte: tournament.entryFee } },
        data: { coins: { decrement: tournament.entryFee } },
      });
      if (deducted.count === 0) throw new Error("INSUFFICIENT_COINS");

      const entry = await tx.tournamentEntry.create({
        data: { tournamentId, userId },
      });

      const updated = await tx.tournament.update({
        where: { id: tournamentId },
        data: { prizePool: { increment: tournament.entryFee } },
        include: { _count: { select: { entries: true } } },
      });

      // Auto-start once the tournament fills up. roomId is deterministic
      // (`t_<tournamentId>`) - the socket server derives the same value
      // independently, this column just makes it queryable/explicit. The
      // actual Room object is created lazily by the socket server the
      // moment the first entrant connects to it (see server/rooms.ts
      // createOrJoinTournamentRoom) - nothing to do here but flip status.
      let finalTournament = updated;
      if (updated._count.entries >= updated.maxPlayers) {
        finalTournament = await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: "in_progress", startedAt: new Date(), roomId: `t_${tournamentId}` },
          include: { _count: { select: { entries: true } } },
        });
      }

      return { entry, tournament: finalTournament };
    });

    return NextResponse.json({ joined: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";

    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (message === "NOT_OPEN") {
      return NextResponse.json({ error: "Tournament is not open for entries" }, { status: 409 });
    }
    if (message === "FULL") {
      return NextResponse.json({ error: "Tournament is full" }, { status: 409 });
    }
    if (message === "INSUFFICIENT_COINS") {
      return NextResponse.json({ error: "Not enough coins" }, { status: 402 });
    }
    // Unique constraint violation = already joined.
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "You already joined this tournament" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to join tournament" }, { status: 500 });
  }
}