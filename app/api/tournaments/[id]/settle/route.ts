import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

// POST /api/tournaments/[id]/settle
// Body: { winnerId: string, matchId?: string }
// Header: x-internal-secret: must match INTERNAL_API_SECRET
//
// This is called from server/rooms.ts (the socket server) the instant a
// tournament's Ludo match actually finishes - winnerId is the userId of
// whoever's color won the real game, and matchId (when present) is the
// Prisma Match row that game produced, stored on the tournament as a
// permanent record that the payout traces back to a real result. This is
// NOT safe to expose to the client as-is: nothing here re-verifies the
// game result itself, it trusts the caller. That's why it stays locked
// behind a shared secret so it can only be called from trusted server
// code, never directly from the browser.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const internalSecret = req.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_API_SECRET || internalSecret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tournamentId } = await params;
  const { winnerId, matchId } = await req.json();

  if (!winnerId) {
    return NextResponse.json({ error: "winnerId required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: { entries: true },
      });

      if (!tournament) throw new Error("NOT_FOUND");
      if (tournament.status === "completed") throw new Error("ALREADY_SETTLED");
      // Only a tournament that actually got underway can be settled - this
      // also rejects stray/duplicate calls for a tournament that was never
      // started (or was cancelled) in the first place.
      if (tournament.status !== "in_progress") throw new Error("NOT_IN_PROGRESS");

      const winnerEntry = tournament.entries.find((e) => e.userId === winnerId);
      if (!winnerEntry) throw new Error("WINNER_NOT_ENTRANT");

      await tx.user.update({
        where: { id: winnerId },
        data: { coins: { increment: tournament.prizePool } },
      });

      const updated = await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: "completed",
          winnerId,
          completedAt: new Date(),
          matchId: typeof matchId === "string" ? matchId : undefined,
        },
      });

      return updated;
    });

    return NextResponse.json({ settled: true, tournament: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";

    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (message === "ALREADY_SETTLED") {
      return NextResponse.json({ error: "Tournament already settled" }, { status: 409 });
    }
    if (message === "NOT_IN_PROGRESS") {
      return NextResponse.json({ error: "Tournament is not in progress" }, { status: 409 });
    }
    if (message === "WINNER_NOT_ENTRANT") {
      return NextResponse.json({ error: "winnerId did not enter this tournament" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to settle tournament" }, { status: 500 });
  }
}