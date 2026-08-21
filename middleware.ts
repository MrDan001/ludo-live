import {NextRequest,NextResponse} from "next/server";
export function middleware(request:NextRequest){const{pathname}=request.nextUrl;if(pathname==="/home")return NextResponse.redirect(new URL("/dashboard",request.url));if(pathname==="/dashboard"){const url=request.nextUrl.clone();url.pathname="/home";return NextResponse.rewrite(url)}if(pathname==="/game"){const url=request.nextUrl.clone();url.pathname="/board";return NextResponse.rewrite(url)}return NextResponse.next()}
export const config={matcher:["/home","/dashboard","/game"]};
