import "server-only";

import crypto from "crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleOAuthMode = "login" | "link";

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export function googleOAuthEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function createOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function buildGoogleAuthUrl(input: {
  redirectUri: string;
  state: string;
}): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    access_type: "online",
    prompt: "select_account",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(input: {
  code: string;
  redirectUri: string;
}): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed.");
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Google token response missing access_token.");
  }

  return payload.access_token;
}

export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to load Google profile.");
  }

  const payload = (await response.json()) as GoogleUserInfo;
  if (!payload.sub || !payload.email) {
    throw new Error("Google profile is missing required fields.");
  }
  if (!payload.email_verified) {
    throw new Error("Google email is not verified.");
  }

  return payload;
}

export function googleRedirectUri(appUrl: string): string {
  return `${appUrl}/api/auth/google/callback`;
}
