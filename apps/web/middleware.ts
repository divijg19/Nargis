import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Public routes that do not require authentication
const PUBLIC_PATH_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/_next",
  "/api",
  "/favicon.ico",
  "/public",
  "/assets",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for JWT cookie set by client-side auth service
  const token = req.cookies.get("nargis_auth_token")?.value;
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    const nextParam = pathname + (search || "");
    loginUrl.searchParams.set("next", nextParam);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except Next static/file routes; exclusions above add extra safety
  matcher: ["/(.*)"],
};
