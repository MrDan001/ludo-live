import { NextResponse } from "next/server";
import { getShopCatalog } from "../catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await getShopCatalog();
    return NextResponse.json({ ok: true, items }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load shop catalogue." }, { status: 500 });
  }
}
