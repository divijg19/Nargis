import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Public routes that do not require authentication.
// NOTE: Do NOT include "/" as a prefix, otherwise every route becomes public.
const PUBLIC_PATHS_EXACT = ["/", "/login", "/register"];
const PUBLIC_PATH_PREFIXES = [
  "/_next",
  "/api",
  "/favicon.ico",
  "/public",
  "/assets",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS_EXACT.includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for JWT cookie set by server-side auth flow
  const token = req.cookies.get("access_token")?.value;
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
