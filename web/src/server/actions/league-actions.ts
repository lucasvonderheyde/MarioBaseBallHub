"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leagueMembers, leagues, seasons, users } from "@/db/schema";
import { requireUser, userIsSiteAdmin } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import {
  DEFAULT_TIEBREAKER_ORDER,
  serializeTiebreakerOrder,
} from "@/domain/standings/tiebreakers";
import { redirectWithFormError } from "@/server/flash-redirect";
import { newUuid, slugifyLeagueSegment } from "@/server/ids";

export async function createLeagueAction(formData: FormData) {
  const user = await requireUser();
  if (!userIsSiteAdmin(user)) {
    redirectWithFormError("/leagues", "Only site admins can create leagues.");
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectWithFormError("/leagues", "League name required.");
  const id = newUuid();
  const slug = `${slugifyLeagueSegment(name) || "league"}-${id.slice(0, 8)}`;
  await db.insert(leagues).values({ id, name, slug });
  await db.insert(leagueMembers).values({
    leagueId: id,
    userId: user.id,
    role: "admin",
  });
  revalidatePath("/leagues");
  redirect(`/leagues/${id}`);
}

export async function createSeasonAction(leagueId: string, formData: FormData) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") redirectWithFormError(`/leagues/${leagueId}`, "Forbidden.");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectWithFormError(`/leagues/${leagueId}`, "Season name required.");
  const id = newUuid();
  await db.insert(seasons).values({
    id,
    leagueId,
    name,
    status: "setup",
    tiebreakerOrder: serializeTiebreakerOrder([...DEFAULT_TIEBREAKER_ORDER]),
  });
  revalidatePath(`/leagues/${leagueId}`);
  redirect(`/leagues/${leagueId}/seasons/${id}`);
}

export async function addMemberAction(leagueId: string, formData: FormData) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") redirectWithFormError(`/leagues/${leagueId}`, "Forbidden.");
  const username = String(formData.get("username") ?? "").trim();
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!target)
    redirectWithFormError(
      `/leagues/${leagueId}`,
      "User not found. They must register first.",
    );
  await db
    .insert(leagueMembers)
    .values({ leagueId, userId: target.id, role: "manager" })
    .onConflictDoNothing();
  revalidatePath(`/leagues/${leagueId}`);
  redirect(`/leagues/${leagueId}?m=member`);
}

export async function renameLeagueAction(leagueId: string, formData: FormData) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") redirectWithFormError(`/leagues/${leagueId}`, "Forbidden.");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectWithFormError(`/leagues/${leagueId}`, "League name required.");
  const [league] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) redirectWithFormError("/leagues", "League not found.");
  await db.update(leagues).set({ name }).where(eq(leagues.id, leagueId));
  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath("/admin");
  redirect(`/leagues/${leagueId}?m=renamed`);
}

export async function renameSeasonAction(
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") {
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}`,
      "Season name required.",
    );
  }
  const [season] = await db
    .select({ id: seasons.id, leagueId: seasons.leagueId })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  if (!season || season.leagueId !== leagueId) {
    redirectWithFormError(`/leagues/${leagueId}`, "Season not found.");
  }
  await db.update(seasons).set({ name }).where(eq(seasons.id, seasonId));
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`);
  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath("/admin");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}?m=renamed`);
}

export async function updateSeasonStatusAction(
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") {
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  }
  const status = String(formData.get("status") ?? "") as "setup" | "active" | "completed";
  if (!["setup", "active", "completed"].includes(status)) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}`,
      "Invalid season status.",
    );
  }
  const [season] = await db
    .select({ id: seasons.id, leagueId: seasons.leagueId })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  if (!season || season.leagueId !== leagueId) {
    redirectWithFormError(`/leagues/${leagueId}`, "Season not found.");
  }
  await db.update(seasons).set({ status }).where(eq(seasons.id, seasonId));
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`);
  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/schedule`);
  revalidatePath(`/leagues/${leagueId}/playoffs`);
  redirect(`/leagues/${leagueId}/seasons/${seasonId}?m=status-updated`);
}
