"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leagueMembers, leagues, seasons, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import {
  DEFAULT_TIEBREAKER_ORDER,
  serializeTiebreakerOrder,
} from "@/domain/standings/tiebreakers";
import { redirectWithFormError } from "@/server/flash-redirect";
import { newUuid, slugifyLeagueSegment } from "@/server/ids";

export async function createLeagueAction(formData: FormData) {
  const user = await requireUser();
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
  const role = await getLeagueRole(leagueId, user.id);
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
  const role = await getLeagueRole(leagueId, user.id);
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
