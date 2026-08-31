import { NextRequest, NextResponse } from "next/server";

// Preserve the existing home/dashboard routing. Multiplayer room URLs use the
// dedicated multiplayer UI at /game-online. Tournament URLs are left alone.
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/home") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.rewrite(url);
  }

  if (
    pathname === "/game" &&
    searchParams.has("room") &&
    !(searchParams.has("tournament") && searchParams.has("match"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/game-online";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/home", "/dashboard", "/game"] };
