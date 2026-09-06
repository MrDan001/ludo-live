import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/signup", "/auth", "/privacy", "/terms"]);
const SESSION_COOKIE = "ludo_session";

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return pathname.startsWith("/login/") || pathname.startsWith("/register/") || pathname.startsWith("/signup/") || pathname.startsWith("/auth/");
}

function securityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), geolocation=(), payment=(self), usb=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  if (process.env.NODE_ENV === "production") response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // An already-authenticated player must never be allowed to revisit the
  // login/register entry point. This also protects the browser back stack.
  if ((pathname === "/login" || pathname === "/register" || pathname === "/signup") && hasSession) {
    const target = searchParams.get("next");
    const destination = target && target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
    return securityHeaders(NextResponse.redirect(new URL(destination, request.url)));
  }

  // /login and /register are the canonical public entry points, but they
  // intentionally render the existing account page rather than a replacement
  // login/register implementation. The browser URL remains /login or /register.
  if (pathname === "/login" || pathname === "/register" || pathname === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.searchParams.set("mode", pathname === "/login" ? "login" : "create");
    return securityHeaders(NextResponse.rewrite(url));
  }

  if (isPublic(pathname)) return securityHeaders(NextResponse.next());

  // Fast first gate. The cookie is NOT trusted as proof of authentication;
  // protected APIs/server operations must validate it with currentUser().
  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return securityHeaders(NextResponse.redirect(login));
  }

  // Preserve the existing canonical game/dashboard rewrites only after the
  // request has passed the authentication gate.
  if (pathname === "/home") return securityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return securityHeaders(NextResponse.rewrite(url));
  }
  if (pathname === "/game" && (searchParams.has("room") || searchParams.has("tournament"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/game-online";
    return securityHeaders(NextResponse.rewrite(url));
  }

  return securityHeaders(NextResponse.next());
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sounds/|images/|api/).*)"] };
