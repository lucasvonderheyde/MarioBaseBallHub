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
    /*
     * Skip static assets and API image routes so dev stays responsive.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
