/**
 * Grant site admin to an existing user by username.
 * Run: SITE_ADMIN_USERNAME=zomsoth npm run db:promote-site-admin
 */
import { grantSiteAdminFromEnv } from "./grant-site-admin";

async function main() {
  if (!process.env.SITE_ADMIN_USERNAME?.trim()) {
    console.error("Set SITE_ADMIN_USERNAME (e.g. SITE_ADMIN_USERNAME=zomsoth)");
    process.exit(1);
  }
  await grantSiteAdminFromEnv();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
