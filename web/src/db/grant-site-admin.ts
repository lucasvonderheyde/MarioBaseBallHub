import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

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
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    console.log(
      `SITE_ADMIN_USERNAME=${username} is not registered yet; skipping site admin grant.`,
    );
    return;
  }

  if (user.isSiteAdmin) return;

  await db.update(users).set({ isSiteAdmin: true }).where(eq(users.id, user.id));
  console.log(`Granted site admin to ${username}.`);
}
