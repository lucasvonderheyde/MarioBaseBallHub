"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  isConfiguredSiteAdminUsername,
  maybeGrantSiteAdminOnAuth,
} from "@/db/grant-site-admin";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isValidProfilePictureUrl } from "@/lib/manager-profile";
import { redirectWithFormError } from "@/server/flash-redirect";
import { newUuid } from "@/server/ids";
import { BCRYPT_COST, validatePassword } from "@/lib/password-policy";
import { isSafeRedirectPath } from "@/lib/team-claims";
import { resolvePostAuthRedirect } from "@/lib/post-auth-redirect";

async function redirectAfterAuth(userId: string, next: string | null) {
  if (isSafeRedirectPath(next)) redirect(next);
  redirect(await resolvePostAuthRedirect(userId));
}

export async function registerAction(formData: FormData) {
  const next = String(formData.get("next") ?? "").trim() || null;
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (username.length < 2) {
    redirectWithFormError("/register", "Username must be at least 2 characters.");
  }
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) {
    redirectWithFormError("/register", passwordCheck.message);
  }
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const id = newUuid();
  try {
    await db.insert(users).values({
      id,
      username,
      passwordHash: hash,
      passwordSetAt: new Date(),
      displayName: displayName || null,
      isSiteAdmin: isConfiguredSiteAdminUsername(username),
    });
  } catch {
    redirectWithFormError("/register", "Username already taken.");
  }
  await maybeGrantSiteAdminOnAuth(id, username);
  const session = await getSession();
  session.userId = id;
  await session.save();
  redirectAfterAuth(id, next);
}

export async function loginAction(formData: FormData) {
  const next = String(formData.get("next") ?? "").trim() || null;
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!u) {
    redirectWithFormError("/login", "Invalid credentials.");
  }
  if (!u.passwordSetAt) {
    redirectWithFormError(
      "/login",
      "This account uses Google sign-in. Continue with Google instead.",
    );
  }
  if (!(await bcrypt.compare(password, u.passwordHash))) {
    redirectWithFormError("/login", "Invalid credentials.");
  }
  await maybeGrantSiteAdminOnAuth(u.id, u.username);
  const session = await getSession();
  session.userId = u.id;
  await session.save();
  redirectAfterAuth(u.id, next);
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

export async function updateProfileAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirectWithFormError("/login", "Not logged in.");
  const [current] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!current) redirectWithFormError("/login", "Not logged in.");

  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const netplayUsername = String(formData.get("netplayUsername") ?? "").trim();
  const profilePictureUrl = String(formData.get("profilePictureUrl") ?? "").trim();
  if (username.length < 2) {
    redirectWithFormError("/account", "Username must be at least 2 characters.");
  }
  if (!isValidProfilePictureUrl(profilePictureUrl)) {
    redirectWithFormError("/account", "Profile picture must be an http(s) URL.");
  }

  if (username !== current.username) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (taken) redirectWithFormError("/account", "Username already taken.");
  }

  await db
    .update(users)
    .set({
      username,
      displayName: displayName || null,
      netplayUsername: netplayUsername || null,
      profilePictureUrl: profilePictureUrl || null,
    })
    .where(eq(users.id, current.id));

  revalidatePath("/account");
  revalidatePath("/leagues", "layout");

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (isSafeRedirectPath(returnTo)) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}m=profile-updated`);
  }
  redirect("/account?m=updated");
}

export async function changePasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirectWithFormError("/login", "Not logged in.");
  const [current] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!current) redirectWithFormError("/login", "Not logged in.");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!current.passwordSetAt) {
    redirectWithFormError(
      "/account",
      "Set a password first — your account currently uses Google sign-in only.",
    );
  }

  if (!(await bcrypt.compare(currentPassword, current.passwordHash))) {
    redirectWithFormError("/account", "Current password is incorrect.");
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.ok) {
    redirectWithFormError("/account", passwordCheck.message);
  }
  if (newPassword !== confirmPassword) {
    redirectWithFormError("/account", "New passwords do not match.");
  }
  if (await bcrypt.compare(newPassword, current.passwordHash)) {
    redirectWithFormError(
      "/account",
      "New password must be different from your current password.",
    );
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await db
    .update(users)
    .set({ passwordHash: hash, passwordSetAt: new Date() })
    .where(eq(users.id, current.id));

  revalidatePath("/account");
  redirect("/account?tab=profile&m=password-updated");
}
