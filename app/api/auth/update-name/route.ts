import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const MIN_LENGTH = 2;
const MAX_LENGTH = 20;
// Letters, numbers, spaces, underscores only - keeps it safe to display
// unescaped on player badges, chat, and voice chat panels everywhere.
const VALID_NAME = /^[a-zA-Z0-9_ ]+$/;

export async function POST(req: NextRequest) {
  const { supabaseId, name } = await req.json();
  if (!supabaseId) return NextResponse.json({ error: "supabaseId required" }, { status: 400 });

  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `Username must be ${MIN_LENGTH}-${MAX_LENGTH} characters` },
      { status: 400 }
    );
  }
  if (!VALID_NAME.test(trimmed)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, spaces, and underscores" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { supabaseId },
    data: { name: trimmed },
  });

  return NextResponse.json({ name: user.name });
}