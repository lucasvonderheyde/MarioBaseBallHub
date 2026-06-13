import { NextResponse, type NextRequest } from "next/server";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  googleOAuthEnabled,
  googleRedirectUri,
  type GoogleOAuthMode,
} from "@/lib/google-oauth";
import { getPublicOrigin, publicUrlForRequest } from "@/lib/app-url";
import { getSession } from "@/lib/session";
import { isSafeRedirectPath } from "@/lib/team-claims";

function parseMode(value: string | null): GoogleOAuthMode {
  return value === "link" ? "link" : "login";
}

export async function GET(request: NextRequest) {
  if (!googleOAuthEnabled()) {
    return NextResponse.redirect(
      publicUrlForRequest(
        request,
        "/login?e=Google%20sign-in%20is%20not%20configured.",
      ),
    );
  }

  const mode = parseMode(request.nextUrl.searchParams.get("mode"));
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = isSafeRedirectPath(next) ? next : null;

  if (mode === "link") {
    const session = await getSession();
    if (!session.userId) {
      const loginUrl = publicUrlForRequest(request, "/login");
      loginUrl.searchParams.set("e", "Log in before linking Google.");
      if (safeNext) loginUrl.searchParams.set("next", safeNext);
      return NextResponse.redirect(loginUrl);
    }
  }

  const appUrl = getPublicOrigin(request);
  const state = createOAuthState();
  const session = await getSession();
  session.oauthState = state;
  session.oauthMode = mode;
  session.oauthNext = safeNext ?? undefined;
  await session.save();

  const redirectUri = googleRedirectUri(appUrl);
  const authUrl = buildGoogleAuthUrl({ redirectUri, state });

  return NextResponse.redirect(authUrl);
}
