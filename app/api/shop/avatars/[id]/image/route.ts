import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../../auth/_db";
import { stripAvatarBackground } from "../../../../../lib/avatar-background";

export const dynamic = "force-dynamic";

export async function GET(_q: NextRequest, { params }: { params: { id: string } }) {
  try {
    const r = await pool.query<{ image_data: Buffer; image_type: string | null; is_published: boolean }>(
      `SELECT image_data,image_type,is_published FROM ludo_shop_avatars WHERE id=$1 LIMIT 1`,
      [params.id],
    );
    const row = r.rows[0];
    if (!row?.image_data || !row.is_published) return new NextResponse(null, { status: 404 });

    // Older managed avatars may have been stored before automatic background
    // removal existed. Normalize those assets lazily on first request so existing
    // avatars are upgraded without requiring the admin to re-upload them.
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
        // A legacy image that cannot be processed should still be served rather
        // than making the avatar disappear entirely.
        console.error("Unable to normalize legacy avatar artwork", processingError);
      }
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse(null, { status: 404 });
  }
}
