import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { oauthAccounts } from "@/db/schema";

export async function getGoogleAccountForUser(userId: string) {
  const [row] = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.userId, userId),
        eq(oauthAccounts.provider, "google"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getGoogleAccountByProviderId(providerAccountId: string) {
  const [row] = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, "google"),
        eq(oauthAccounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}
