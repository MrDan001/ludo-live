import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

// POST /api/tournaments/[id]/settle
// Body: { winnerId: string }
// Header: x-internal-secret: must match INTERNAL_API_SECRET
//
// IMPORTANT: this is intentionally NOT safe to expose to the client as-is.
// Nothing here verifies that winnerId actually won a real match - that
// wiring happens in Stage 4, once tournament entries are connected to
// the multiplayer match engine and the winner is derived from an actual
// game result server-side. Until then, this route is locked behind a
// shared secret so it can only be called from trusted server code (e.g.
// a future match-completion handler), never directly from the browser.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const internalSecret = req.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_API_SECRET || internalSecret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tournamentId } = await params;
  const { winnerId } = await req.json();

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

      const winnerEntry = tournament.entries.find((e) => e.userId === winnerId);
      if (!winnerEntry) throw new Error("WINNER_NOT_ENTRANT");

      await tx.user.update({
        where: { id: winnerId },
        data: { coins: { increment: tournament.prizePool } },
      });

      const updated = await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: "completed", winnerId, completedAt: new Date() },
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
    if (message === "WINNER_NOT_ENTRANT") {
      return NextResponse.json({ error: "winnerId did not enter this tournament" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to settle tournament" }, { status: 500 });
  }
}