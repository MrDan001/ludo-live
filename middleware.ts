import { NextRequest, NextResponse } from "next/server";

// Preserve the existing home/dashboard routing. Multiplayer /game URLs must
// render app/game/page.tsx so the authoritative MultiplayerGame header/UI is used.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/home") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/home", "/dashboard", "/game"] };
