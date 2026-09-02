import {NextRequest,NextResponse} from "next/server";

const PUBLIC_PATHS=new Set(["/","/login","/signup","/auth","/privacy","/terms"]);
const SESSION_COOKIE="ludo_session";

function isPublic(pathname:string){
  if(PUBLIC_PATHS.has(pathname))return true;
  return pathname.startsWith("/login/")||pathname.startsWith("/signup/")||pathname.startsWith("/auth/");
}

function securityHeaders(response:NextResponse){
  response.headers.set("X-Frame-Options","DENY");
  response.headers.set("X-Content-Type-Options","nosniff");
  response.headers.set("Referrer-Policy","strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy","camera=(), geolocation=(), payment=(self), usb=()");
  response.headers.set("X-DNS-Prefetch-Control","off");
  if(process.env.NODE_ENV==="production")response.headers.set("Strict-Transport-Security","max-age=31536000; includeSubDomains");
  return response;
}

export function middleware(request:NextRequest){
  const{pathname,searchParams}=request.nextUrl;

  if(isPublic(pathname))return securityHeaders(NextResponse.next());

  // Fast first gate. The cookie is NOT trusted as proof of authentication;
  // protected APIs/server operations must validate it with currentUser().
  if(!request.cookies.get(SESSION_COOKIE)?.value){
    const login=new URL("/login",request.url);
    login.searchParams.set("next",pathname+request.nextUrl.search);
    return securityHeaders(NextResponse.redirect(login));
  }

  // Preserve the existing canonical game/dashboard rewrites only after the
  // request has passed the authentication gate.
  if(pathname==="/home")return securityHeaders(NextResponse.redirect(new URL("/dashboard",request.url)));
  if(pathname==="/dashboard"){
    const url=request.nextUrl.clone();url.pathname="/home";
    return securityHeaders(NextResponse.rewrite(url));
  }
  if(pathname==="/game"&&(searchParams.has("room")||searchParams.has("tournament"))){
    const url=request.nextUrl.clone();url.pathname="/game-online";
    return securityHeaders(NextResponse.rewrite(url));
  }

  return securityHeaders(NextResponse.next());
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sounds/|images/|api/).*)"]};
