import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { GoogleOAuthMode } from "@/lib/google-oauth";

export type SessionData = {
  userId?: string;
  oauthState?: string;
  oauthMode?: GoogleOAuthMode;
  oauthNext?: string;
};

export const sessionOptions: SessionOptions = {
  cookieName: "mbb_hub",
  password:
    process.env.SESSION_PASSWORD ??
    "0123456789abcdef0123456789abcdef",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
  },
};

export async function getSession() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  return session;
}
