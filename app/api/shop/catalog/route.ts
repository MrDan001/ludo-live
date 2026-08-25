import { NextResponse } from "next/server";
import { getShopCatalog } from "../catalog";

export async function GET() {
  try {
    const items = await getShopCatalog();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load shop catalogue." }, { status: 500 });
  }
}
