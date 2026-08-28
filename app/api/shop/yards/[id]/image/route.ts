import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../../auth/_db";
export async function GET(_q:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;const r=await pool.query<any>(`SELECT image_data,image_type,is_published FROM ludo_shop_yards WHERE id=$1 LIMIT 1`,[id]);const x=r.rows[0];if(!x||!x.is_published||!x.image_data)return new NextResponse("Not found",{status:404});return new NextResponse(x.image_data,{headers:{"Content-Type":x.image_type,"Cache-Control":"public, max-age=31536000, immutable"}});}
