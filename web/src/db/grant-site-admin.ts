import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

export function isConfiguredSiteAdminUsername(username: string): boolean {
  const configured = process.env.SITE_ADMIN_USERNAME?.trim();
  if (!configured) return false;
  return username.localeCompare(configured, undefined, { sensitivity: "accent" }) === 0;
}

export async function grantSiteAdminToUserId(userId: string): Promise<boolean> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      isSiteAdmin: users.isSiteAdmin,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.isSiteAdmin) return false;

  await db.update(users).set({ isSiteAdmin: true }).where(eq(users.id, user.id));
  console.log(`Granted site admin to ${user.username}.`);
  return true;
}

/** Idempotent: grants site admin when SITE_ADMIN_USERNAME matches a registered user. */
export async function grantSiteAdminFromEnv(): Promise<void> {
  const username = process.env.SITE_ADMIN_USERNAME?.trim();
  if (!username) return;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      isSiteAdmin: users.isSiteAdmin,
    })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1);

  if (!user) {
    console.log(
      `SITE_ADMIN_USERNAME=${username} is not registered yet; skipping site admin grant.`,
    );
    return;
  }

  if (user.isSiteAdmin) return;

  await db.update(users).set({ isSiteAdmin: true }).where(eq(users.id, user.id));
  console.log(`Granted site admin to ${user.username}.`);
}

export async function maybeGrantSiteAdminOnAuth(userId: string, username: string): Promise<void> {
  if (!isConfiguredSiteAdminUsername(username)) return;
  await grantSiteAdminToUserId(userId);
}

export function adminSetupSecretConfigured(): boolean {
  return Boolean(process.env.ADMIN_SETUP_SECRET?.trim());
}

export function verifyAdminSetupSecret(provided: string): boolean {
  const configured = process.env.ADMIN_SETUP_SECRET?.trim();
  if (!configured) return false;
  return provided === configured;
}
