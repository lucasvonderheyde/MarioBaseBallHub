"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { redirectWithFormError } from "@/server/flash-redirect";
import { newUuid } from "@/server/ids";

export async function registerAction(formData: FormData) {
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
  redirect("/leagues");
}

export async function loginAction(formData: FormData) {
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
  redirect("/leagues");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
