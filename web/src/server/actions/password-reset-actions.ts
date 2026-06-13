"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { getAppUrl } from "@/lib/app-url";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiresAt,
} from "@/lib/password-reset";
import { BCRYPT_COST, validatePassword } from "@/lib/password-policy";
import { unlinkGoogleForUser } from "@/lib/google-oauth-callback";
import { getSession } from "@/lib/session";
import { sendPasswordResetEmail } from "@/lib/send-email";
import { redirectWithFormError } from "@/server/flash-redirect";

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    redirectWithFormError("/forgot-password", "Enter a valid email address.");
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user?.email) {
    const { token, tokenHash } = createPasswordResetToken();
    const now = new Date();
    await db.insert(passwordResetTokens).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt: passwordResetExpiresAt(now),
      createdAt: now,
    });

    const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({ to: user.email, resetUrl });
  }

  redirect(`/forgot-password?m=sent`);
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    redirectWithFormError("/forgot-password", "Reset link is invalid.");
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.ok) {
    redirectWithFormError(
      `/reset-password?token=${encodeURIComponent(token)}`,
      passwordCheck.message,
    );
  }
  if (newPassword !== confirmPassword) {
    redirectWithFormError(
      `/reset-password?token=${encodeURIComponent(token)}`,
      "Passwords do not match.",
    );
  }

  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();
  const [resetRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!resetRow) {
    redirectWithFormError(
      "/forgot-password",
      "This reset link is invalid or has expired.",
    );
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await db
    .update(users)
    .set({ passwordHash: hash, passwordSetAt: new Date() })
    .where(eq(users.id, resetRow.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, resetRow.id));

  redirect("/login?m=password-reset");
}

export async function unlinkGoogleAction() {
  const session = await getSession();
  if (!session.userId) redirectWithFormError("/login", "Not logged in.");

  const result = await unlinkGoogleForUser(session.userId);
  if (result.error) redirectWithFormError("/account", result.error);

  redirect("/account?m=google-unlinked");
}

export async function setInitialPasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirectWithFormError("/login", "Not logged in.");

  const [current] = await db
    .select({ passwordSetAt: users.passwordSetAt })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!current) redirectWithFormError("/login", "Not logged in.");
  if (current.passwordSetAt) {
    redirectWithFormError("/account", "You already have a password set.");
  }

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.ok) {
    redirectWithFormError("/account", passwordCheck.message);
  }
  if (newPassword !== confirmPassword) {
    redirectWithFormError("/account", "Passwords do not match.");
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await db
    .update(users)
    .set({ passwordHash: hash, passwordSetAt: new Date() })
    .where(eq(users.id, session.userId));

  redirect("/account?m=password-set");
}
