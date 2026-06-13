import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  isConfiguredSiteAdminUsername,
  maybeGrantSiteAdminOnAuth,
} from "@/db/grant-site-admin";
import { oauthAccounts, users } from "@/db/schema";
import type { GoogleOAuthMode, GoogleUserInfo } from "@/lib/google-oauth";
import {
  getGoogleAccountByProviderId,
  getGoogleAccountForUser,
} from "@/lib/oauth-accounts";
import { suggestUniqueUsername } from "@/lib/suggest-username";
import { getSession } from "@/lib/session";
import { BCRYPT_COST } from "@/lib/password-policy";
import { newUuid } from "@/server/ids";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export type OAuthCallbackResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; redirectTo: string };

function oauthErrorRedirect(
  mode: GoogleOAuthMode,
  message: string,
  next?: string | null,
): OAuthCallbackResult {
  const base = mode === "link" ? "/account" : "/login";
  const params = new URLSearchParams({ e: message });
  if (next) params.set("next", next);
  return { ok: false, error: message, redirectTo: `${base}?${params.toString()}` };
}

async function linkGoogleToUser(
  userId: string,
  profile: GoogleUserInfo,
): Promise<{ error?: string }> {
  const existingLink = await getGoogleAccountByProviderId(profile.sub);
  if (existingLink && existingLink.userId !== userId) {
    return { error: "That Google account is already linked to another user." };
  }

  const [emailOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, profile.email))
    .limit(1);
  if (emailOwner && emailOwner.id !== userId) {
    return { error: "That email is already linked to another account." };
  }

  const now = new Date();
  await db
    .update(users)
    .set({
      email: profile.email,
      emailVerifiedAt: now,
    })
    .where(eq(users.id, userId));

  if (existingLink) {
    await db
      .update(oauthAccounts)
      .set({ email: profile.email })
      .where(eq(oauthAccounts.id, existingLink.id));
    return {};
  }

  await db.insert(oauthAccounts).values({
    id: newUuid(),
    userId,
    provider: "google",
    providerAccountId: profile.sub,
    email: profile.email,
    createdAt: now,
  });

  return {};
}

export async function completeGoogleOAuth(input: {
  mode: GoogleOAuthMode;
  profile: GoogleUserInfo;
  next?: string | null;
}): Promise<OAuthCallbackResult> {
  const session = await getSession();
  const existingLink = await getGoogleAccountByProviderId(input.profile.sub);

  if (input.mode === "link") {
    if (!session.userId) {
      return oauthErrorRedirect(input.mode, "Log in before linking Google.");
    }

    const linkResult = await linkGoogleToUser(session.userId, input.profile);
    if (linkResult.error) {
      return oauthErrorRedirect(input.mode, linkResult.error);
    }

    return { ok: true, redirectTo: "/account?m=google-linked" };
  }

  if (existingLink) {
    await maybeGrantSiteAdminOnAuth(
      existingLink.userId,
      (
        await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, existingLink.userId))
          .limit(1)
      )[0]?.username ?? "",
    );
    session.userId = existingLink.userId;
    session.oauthState = undefined;
    session.oauthMode = undefined;
    session.oauthNext = undefined;
    await session.save();

    const redirectTo = input.next?.startsWith("/") ? input.next : "/leagues";
    return { ok: true, redirectTo };
  }

  const [emailOwner] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.profile.email))
    .limit(1);

  if (emailOwner) {
    const linkResult = await linkGoogleToUser(emailOwner.id, input.profile);
    if (linkResult.error) {
      return oauthErrorRedirect(input.mode, linkResult.error, input.next);
    }

    await maybeGrantSiteAdminOnAuth(emailOwner.id, emailOwner.username);
    session.userId = emailOwner.id;
    session.oauthState = undefined;
    session.oauthMode = undefined;
    session.oauthNext = undefined;
    await session.save();

    const redirectTo = input.next?.startsWith("/") ? input.next : "/leagues";
    return { ok: true, redirectTo };
  }

  const username = await suggestUniqueUsername(
    input.profile.email.split("@")[0] ?? input.profile.name ?? "player",
  );
  const userId = newUuid();
  const now = new Date();
  const placeholderHash = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    BCRYPT_COST,
  );

  await db.insert(users).values({
    id: userId,
    username,
    passwordHash: placeholderHash,
    passwordSetAt: null,
    email: input.profile.email,
    emailVerifiedAt: now,
    displayName: input.profile.name?.trim() || null,
    profilePictureUrl: input.profile.picture?.trim() || null,
    isSiteAdmin: isConfiguredSiteAdminUsername(username),
  });

  await db.insert(oauthAccounts).values({
    id: newUuid(),
    userId,
    provider: "google",
    providerAccountId: input.profile.sub,
    email: input.profile.email,
    createdAt: now,
  });

  await maybeGrantSiteAdminOnAuth(userId, username);
  session.userId = userId;
  session.oauthState = undefined;
  session.oauthMode = undefined;
  session.oauthNext = undefined;
  await session.save();

  const redirectTo = input.next?.startsWith("/") ? input.next : "/account?m=google-created";
  return { ok: true, redirectTo };
}

export async function unlinkGoogleForUser(
  userId: string,
): Promise<{ error?: string }> {
  const [user] = await db
    .select({ passwordSetAt: users.passwordSetAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return { error: "User not found." };
  if (!user.passwordSetAt) {
    return {
      error: "Set a password before unlinking Google — otherwise you cannot log in.",
    };
  }

  const link = await getGoogleAccountForUser(userId);
  if (!link) return { error: "No Google account is linked." };

  await db.delete(oauthAccounts).where(eq(oauthAccounts.id, link.id));
  await db
    .update(users)
    .set({ email: null, emailVerifiedAt: null })
    .where(eq(users.id, userId));

  return {};
}
