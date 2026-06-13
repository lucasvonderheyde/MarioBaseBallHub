import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  googleRedirectUri,
} from "@/lib/google-oauth";
import { completeGoogleOAuth } from "@/lib/google-oauth-callback";
import { getAppUrl } from "@/lib/app-url";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?e=${encodeURIComponent("Google sign-in was cancelled.")}`,
        request.url,
      ),
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const session = await getSession();

  if (!code || !state || !session.oauthState || state !== session.oauthState) {
    return NextResponse.redirect(
      new URL(
        `/login?e=${encodeURIComponent("Invalid Google sign-in state. Try again.")}`,
        request.url,
      ),
    );
  }

  const mode = session.oauthMode ?? "login";
  const next = session.oauthNext ?? null;

  try {
    const appUrl = getAppUrl(request.nextUrl.origin);
    const redirectUri = googleRedirectUri(appUrl);
    const accessToken = await exchangeGoogleCode({ code, redirectUri });
    const profile = await fetchGoogleUserInfo(accessToken);
    const result = await completeGoogleOAuth({ mode, profile, next });
    return NextResponse.redirect(new URL(result.redirectTo, request.url));
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Google sign-in failed.";
    const base = mode === "link" ? "/account" : "/login";
    return NextResponse.redirect(
      new URL(`${base}?e=${encodeURIComponent(message)}`, request.url),
    );
  }
}
