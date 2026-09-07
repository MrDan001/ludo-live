import { NextRequest, NextResponse } from "next/server";

const AUTH_PATHS = new Set(["/login", "/register", "/signup"]);
const SESSION_COOKIE = "ludo_session";

function securityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), geolocation=(), payment=(self), usb=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const adminApp = process.env.ADMIN_APP_URL || "";
  const gatewayToken = process.env.ADMIN_GATEWAY_TOKEN || "";
  const gatewayHeader = request.headers.get("x-ludo-admin-gateway") || "";

  // Admin runs on its own origin. Direct visits from the player origin are handed off.
  if (pathname === "/dbase" || pathname.startsWith("/dbase/")) {
    if (gatewayToken && gatewayHeader === gatewayToken) {
      return securityHeaders(NextResponse.next());
    }
    if (adminApp) {
      return securityHeaders(NextResponse.redirect(new URL(adminApp + pathname + (request.nextUrl.search || ""), request.url), 307));
    }
    return securityHeaders(NextResponse.json({ error: "Admin application is not configured." }, { status: 503 }));
  }

  // Admin is a separate same-origin application namespace, wired like eHealthCare:
  // its login/manifest/worker are public and its data access remains protected by /api/admin.
  if (pathname === "/admin-manifest.json" || pathname === "/dbase/sw.js") {
    return securityHeaders(NextResponse.next());
  }
  if (pathname === "/dbase" || pathname.startsWith("/dbase/")) {
    return securityHeaders(NextResponse.next());
  }

  // The browser/app distinction is handled client-side because a standalone
  // PWA does not send a reliable server-side "standalone" flag. Keeping the
  // PWA cookie out of server auth prevents a browser-scoped cookie from
  // accidentally becoming the authentication gate.
  if (pathname === "/open-app" || pathname === "/app") {
    return securityHeaders(NextResponse.next());
  }

  if (AUTH_PATHS.has(pathname)) {
    if (hasSession) {
      const target = searchParams.get("next");
      const destination =
        target && target.startsWith("/") && !target.startsWith("//")
          ? target
          : "/dashboard";
      return securityHeaders(NextResponse.redirect(new URL(destination, request.url)));
    }

    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.searchParams.set("mode", pathname === "/login" ? "login" : "create");
    if (searchParams.get("next")) {
      url.searchParams.set("next", searchParams.get("next")!);
    }
    return securityHeaders(NextResponse.rewrite(url));
  }

  if (pathname === "/") {
    return securityHeaders(NextResponse.redirect(new URL("/app", request.url)));
  }

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return securityHeaders(NextResponse.redirect(login));
  }

  if (pathname === "/home") {
    return securityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|admin-manifest.json|dbase/sw.js|icons/|sounds/|images/|api/|sw.js).*)"]
};
