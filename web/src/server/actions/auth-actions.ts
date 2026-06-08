"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { redirectWithFormError } from "@/server/flash-redirect";
import { newUuid } from "@/server/ids";
import { isSafeRedirectPath } from "@/lib/team-claims";

function redirectAfterAuth(next: string | null) {
  if (isSafeRedirectPath(next)) redirect(next);
  redirect("/leagues");
}

export async function registerAction(formData: FormData) {
  const next = String(formData.get("next") ?? "").trim() || null;
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (username.length < 2 || password.length < 6) {
    redirectWithFormError(
      "/register",
      "Username (2+) and password (6+) required.",
    );
  }
  const hash = await bcrypt.hash(password, 10);
  const id = newUuid();
  try {
    await db.insert(users).values({
      id,
      username,
      passwordHash: hash,
      displayName: displayName || null,
    });
  } catch {
    redirectWithFormError("/register", "Username already taken.");
  }
  const session = await getSession();
  session.userId = id;
  await session.save();
  redirectAfterAuth(next);
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
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
    redirectWithFormError("/login", "Invalid credentials.");
  }
  const session = await getSession();
  session.userId = u.id;
  await session.save();
  redirectAfterAuth(next);
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
  if (username.length < 2) {
    redirectWithFormError("/account", "Username must be at least 2 characters.");
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
    })
    .where(eq(users.id, current.id));

  redirect("/account?m=updated");
}
