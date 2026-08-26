import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../../auth/_db";

export const dynamic="force-dynamic";

export async function GET(_q:NextRequest,{params}:{params:{id:string}}){
  try{
    const r=await pool.query<{image_data:Buffer;image_type:string|null;is_published:boolean}>(`SELECT image_data,image_type,is_published FROM ludo_shop_avatars WHERE id=$1 LIMIT 1`,[params.id]);
    const row=r.rows[0];if(!row?.image_data||!row.is_published)return new NextResponse(null,{status:404});
    return new NextResponse(row.image_data,{status:200,headers:{"Content-Type":row.image_type||"application/octet-stream","Cache-Control":"public, max-age=300, must-revalidate","X-Content-Type-Options":"nosniff"}});
  }catch(e){console.error(e);return new NextResponse(null,{status:404});}
}
