import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/open-app", "/app"]);
const SESSION_COOKIE = "ludo_session";
const PWA_COOKIE = "ludo_pwa";

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return false;
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
  const hasPwa = request.cookies.get(PWA_COOKIE)?.value === "1";

  // The public website is now an installation gateway. The actual product
  // routes are available only to the installed standalone PWA.
  if (pathname === "/open-app" || pathname === "/app") {
    return securityHeaders(NextResponse.next());
  }

  if (!hasPwa) {
    return securityHeaders(NextResponse.redirect(new URL("/open-app", request.url)));
  }

  // Keep the installed-PWA entry point as the application's root experience.
  if (pathname === "/") {
    return securityHeaders(NextResponse.redirect(new URL("/app", request.url)));
  }

  // An already-authenticated player must never be allowed to revisit the
  // login/register entry point.
  if ((pathname === "/login" || pathname === "/register" || pathname === "/signup") && hasSession) {
    const target = searchParams.get("next");
    const destination = target && target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
    return securityHeaders(NextResponse.redirect(new URL(destination, request.url)));
  }

  if (pathname === "/login" || pathname === "/register" || pathname === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.searchParams.set("mode", pathname === "/login" ? "login" : "create");
    return securityHeaders(NextResponse.rewrite(url));
  }

  // Fast first gate for authentication. The PWA cookie is only the app-entry
  // gate; protected APIs/server operations still validate the real session.
  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return securityHeaders(NextResponse.redirect(login));
  }

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

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sounds/|images/|api/|sw.js).*)"] };
