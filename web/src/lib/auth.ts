import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "./session";

export type AppUser = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  return u ?? null;
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export function userIsSiteAdmin(user: Pick<AppUser, "isSiteAdmin">): boolean {
  return user.isSiteAdmin;
}

export async function requireSiteAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (!userIsSiteAdmin(user)) throw new Error("Forbidden");
  return user;
}
