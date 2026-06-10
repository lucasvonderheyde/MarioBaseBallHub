"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backupLiveDatabase, db } from "@/db";
import { resolveDbPath } from "@/db/resolve-db-path";
import { scheduleDatabaseRestore } from "@/db/sqlite-backup";
import { leagueMembers, leagues, seasons, users } from "@/db/schema";
import { requireSiteAdmin } from "@/lib/auth";
import { getDatabaseIntegrityReport } from "@/lib/database-integrity";
import { importLeagueBackup, type LeagueBackup } from "@/lib/league-backup";
import { redirectWithFormError } from "@/server/flash-redirect";

export async function deleteLeagueAction(formData: FormData) {
  await requireSiteAdmin();
  const leagueId = String(formData.get("leagueId") ?? "").trim();
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  if (!leagueId) redirectWithFormError("/admin", "Missing league id.");

  const [league] = await db
    .select({ id: leagues.id, name: leagues.name, slug: leagues.slug })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) redirectWithFormError("/admin", "League not found.");
  if (confirmName !== league.name) {
    redirectWithFormError(
      "/admin",
      `Type the league name exactly ("${league.name}") to confirm delete.`,
    );
  }
  await backupLiveDatabase(`pre-delete-league-${league.slug}`);
  await db.delete(leagues).where(eq(leagues.id, leagueId));
  revalidatePath("/admin");
  revalidatePath("/leagues");
  redirect("/admin?m=league-deleted");
}

export async function deleteSeasonAction(formData: FormData) {
  await requireSiteAdmin();
  const seasonId = String(formData.get("seasonId") ?? "").trim();
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  if (!seasonId) redirectWithFormError("/admin", "Missing season id.");

  const [season] = await db
    .select({
      id: seasons.id,
      leagueId: seasons.leagueId,
      name: seasons.name,
    })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  if (!season) redirectWithFormError("/admin", "Season not found.");
  if (confirmName !== season.name) {
    redirectWithFormError(
      "/admin",
      `Type the season name exactly ("${season.name}") to confirm delete.`,
    );
  }
  await backupLiveDatabase(`pre-delete-season-${season.id.slice(0, 8)}`);
  await db.delete(seasons).where(eq(seasons.id, seasonId));
  revalidatePath("/admin");
  revalidatePath(`/leagues/${season.leagueId}`);
  redirect(`/leagues/${season.leagueId}?m=season-deleted`);
}

export async function deleteUserAction(userId: string) {
  const admin = await requireSiteAdmin();
  if (admin.id === userId) {
    redirectWithFormError("/admin", "You cannot delete your own account.");
  }
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) redirectWithFormError("/admin", "User not found.");
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/admin");
  redirect("/admin?m=user-deleted");
}

export async function setSiteAdminAction(userId: string, formData: FormData) {
  const admin = await requireSiteAdmin();
  const makeAdmin = formData.get("makeAdmin") === "true";
  if (admin.id === userId && !makeAdmin) {
    redirectWithFormError("/admin", "You cannot remove your own site admin access.");
  }
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) redirectWithFormError("/admin", "User not found.");
  await db
    .update(users)
    .set({ isSiteAdmin: makeAdmin })
    .where(eq(users.id, userId));
  revalidatePath("/admin");
  redirect(`/admin?m=${makeAdmin ? "admin-granted" : "admin-revoked"}`);
}

export async function addLeagueMemberAsAdminAction(
  leagueId: string,
  formData: FormData,
) {
  await requireSiteAdmin();
  const username = String(formData.get("username") ?? "").trim();
  if (!username) redirectWithFormError("/admin", "Username required.");
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!target) {
    redirectWithFormError("/admin", "User not found. They must register first.");
  }
  const [league] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) redirectWithFormError("/admin", "League not found.");
  await db
    .insert(leagueMembers)
    .values({ leagueId, userId: target.id, role: "admin" })
    .onConflictDoUpdate({
      target: [leagueMembers.leagueId, leagueMembers.userId],
      set: { role: "admin" },
    });
  revalidatePath("/admin");
  revalidatePath(`/leagues/${leagueId}`);
  redirect(`/admin?m=member-added`);
}

export async function renameUserAction(userId: string, formData: FormData) {
  await requireSiteAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (username.length < 2) {
    redirectWithFormError("/admin", "Username must be at least 2 characters.");
  }
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) redirectWithFormError("/admin", "User not found.");
  if (username !== target.username) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (taken) redirectWithFormError("/admin", "Username already taken.");
  }
  await db
    .update(users)
    .set({
      username,
      displayName: displayName || null,
    })
    .where(eq(users.id, userId));
  revalidatePath("/admin");
  redirect("/admin?m=user-renamed");
}

export async function repairOrphanedLeaguesAction() {
  await requireSiteAdmin();
  const report = await getDatabaseIntegrityReport();
  const orphanedIds = new Set(report.orphanedSeasonLeagueIds);

  if (report.orphanedLeagueMembers > 0) {
    const leagueIds = await db.select({ id: leagues.id }).from(leagues);
    const knownLeagueIds = leagueIds.map((row) => row.id);
    const memberLeagueIds = await db
      .selectDistinct({ leagueId: leagueMembers.leagueId })
      .from(leagueMembers);
    for (const row of memberLeagueIds) {
      if (!knownLeagueIds.includes(row.leagueId)) {
        orphanedIds.add(row.leagueId);
      }
    }
  }

  if (orphanedIds.size === 0) {
    redirectWithFormError("/admin", "No orphaned leagues to repair.");
  }

  let repaired = 0;
  for (const leagueId of orphanedIds) {
    const [existing] = await db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);
    if (existing) continue;

    const slug = `restored-${leagueId.slice(0, 8)}`;
    await db.insert(leagues).values({
      id: leagueId,
      name: "Restored league",
      slug,
    });
    repaired += 1;
  }

  revalidatePath("/admin");
  revalidatePath("/leagues");
  redirect(`/admin?m=leagues-repaired&n=${repaired}`);
}

export async function createDatabaseBackupNowAction() {
  await requireSiteAdmin();
  const backupPath = await backupLiveDatabase("manual-snapshot");
  if (!backupPath) {
    redirectWithFormError(
      "/admin",
      "Could not create backup. Check that the database file exists on the volume.",
    );
  }
  revalidatePath("/admin");
  redirect("/admin?m=db-backup-created");
}

export async function restoreDatabaseBackupAction(formData: FormData) {
  await requireSiteAdmin();
  const filename = String(formData.get("filename") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "RESTORE") {
    redirectWithFormError('/admin', 'Type RESTORE to confirm full database rollback.');
  }
  if (!filename) {
    redirectWithFormError("/admin", "Choose a database backup file.");
  }

  try {
    scheduleDatabaseRestore(resolveDbPath(), filename);
  } catch (error) {
    redirectWithFormError(
      "/admin",
      error instanceof Error ? error.message : "Could not schedule restore.",
    );
  }

  redirect(
    "/admin?m=db-restore-scheduled&file=" + encodeURIComponent(filename),
  );
}

export async function restoreLeagueBackupAction(formData: FormData) {
  await requireSiteAdmin();
  const jsonText = String(formData.get("backupJson") ?? "").trim();
  if (!jsonText) {
    redirectWithFormError("/admin", "Paste a league backup JSON file first.");
  }

  let backup: LeagueBackup;
  try {
    backup = JSON.parse(jsonText) as LeagueBackup;
  } catch {
    redirectWithFormError("/admin", "Invalid JSON.");
  }

  try {
    await backupLiveDatabase("pre-restore-league-json");
    const leagueId = await importLeagueBackup(backup);
    revalidatePath("/admin");
    revalidatePath("/leagues");
    revalidatePath(`/leagues/${leagueId}`, "layout");
    redirect(`/admin?m=league-restored&name=${encodeURIComponent(backup.league.name)}`);
  } catch (error) {
    redirectWithFormError(
      "/admin",
      error instanceof Error ? error.message : "Restore failed.",
    );
  }
}
