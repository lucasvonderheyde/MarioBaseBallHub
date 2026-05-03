import { type NextRequest, NextResponse } from "next/server";

/**
 * MVP auth uses iron-session only. No per-request remote calls here — a bad or
 * half-configured Supabase env was causing slow/hung dev servers.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
