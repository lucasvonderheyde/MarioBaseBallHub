/**
 * Grant site admin to an existing user by username.
 * Run: SITE_ADMIN_USERNAME=zomsoth npm run db:promote-site-admin
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

async function main() {
  const username = process.env.SITE_ADMIN_USERNAME?.trim();
  if (!username) {
    console.error("Set SITE_ADMIN_USERNAME (e.g. SITE_ADMIN_USERNAME=zomsoth)");
    process.exit(1);
  }

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
    console.error(`User not found: ${username}. They must register first.`);
    process.exit(1);
  }

  if (user.isSiteAdmin) {
    console.log(`${username} already has site admin access.`);
    return;
  }

  await db.update(users).set({ isSiteAdmin: true }).where(eq(users.id, user.id));
  console.log(`Granted site admin to ${username}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
