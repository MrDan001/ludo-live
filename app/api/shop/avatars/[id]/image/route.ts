import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../../auth/_db";
import { stripAvatarBackground } from "../../../../../../lib/avatar-background";

export const dynamic = "force-dynamic";

export async function GET(_q: NextRequest, { params }: { params: { id: string } }) {
  try {
    const r = await pool.query<{ image_data: Buffer; image_type: string | null; is_published: boolean }>(
      `SELECT image_data,image_type,is_published FROM ludo_shop_avatars WHERE id=$1 LIMIT 1`,
      [params.id],
    );
    const row = r.rows[0];
    if (!row?.image_data || !row.is_published) return new NextResponse(null, { status: 404 });

    // New admin uploads are normalized to PNG before they reach the database.
    // Keep the legacy migration path, but only run it once: after normalization
    // the stored type becomes PNG and subsequent requests are a cheap byte read.
    let bytes = row.image_data;
    let contentType = row.image_type || "application/octet-stream";
    if (contentType !== "image/png") {
      try {
        bytes = await stripAvatarBackground(bytes);
        contentType = "image/png";
        await pool.query(
          `UPDATE ludo_shop_avatars SET image_data=$2,image_type='image/png',updated_at=NOW() WHERE id=$1`,
          [params.id, bytes],
        );
      } catch (processingError) {
        console.error("Unable to normalize legacy avatar artwork", processingError);
      }
    }

    // NextResponse's BodyInit typing is narrower than Node's Buffer generic.
    // Create a plain ArrayBuffer-backed Uint8Array for the binary response.
    const body = new Uint8Array(bytes.length);
    body.set(bytes);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Catalog URLs include the avatar updatedAt version, so immutable caching
        // is safe and prevents repeated database/image requests on every surface.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse(null, { status: 404 });
  }
}
