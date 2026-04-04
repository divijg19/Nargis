import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Phase 12: Open access UX.
  // Never redirect to /login at the edge; anonymous sessions are supported.
  void req;
  return NextResponse.next();
}

export const config = {
  // Match all paths except Next static/file routes; exclusions above add extra safety
  matcher: ["/(.*)"],
};
