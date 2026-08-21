import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest){const {pathname}=request.nextUrl;if(pathname==="/")return NextResponse.redirect(new URL("/home",request.url));if(pathname==="/game"){const url=request.nextUrl.clone();url.pathname="/";return NextResponse.rewrite(url)}return NextResponse.next()}
export const config={matcher:["/","/game"]};