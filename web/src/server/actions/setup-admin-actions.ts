"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  adminSetupSecretConfigured,
  grantSiteAdminToUserId,
  verifyAdminSetupSecret,
} from "@/db/grant-site-admin";
import { requireUser } from "@/lib/auth";
import { redirectWithFormError } from "@/server/flash-redirect";

export async function claimSiteAdminAction(formData: FormData) {
  const user = await requireUser();
  const secret = String(formData.get("secret") ?? "").trim();

  if (!adminSetupSecretConfigured()) {
    redirectWithFormError(
      "/setup-admin",
      "Admin setup is not configured on this server (missing ADMIN_SETUP_SECRET).",
    );
  }

  if (!verifyAdminSetupSecret(secret)) {
    redirectWithFormError("/setup-admin", "Invalid setup secret.");
  }

  await grantSiteAdminToUserId(user.id);
  revalidatePath("/", "layout");
  redirect("/leagues?m=site-admin-granted");
}
