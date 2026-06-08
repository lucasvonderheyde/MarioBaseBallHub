"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leagueMembers, teams } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSeasonLeagueId } from "@/lib/league-access";
import {
  canUserClaimTeam,
  userManagesTeamInSeason,
} from "@/lib/team-claims";
import { redirectWithFormError } from "@/server/flash-redirect";

export async function claimTeamAction(
  teamId: string,
  leagueId: string,
  seasonId: string,
) {
  const user = await requireUser();
  const seasonLeagueId = await getSeasonLeagueId(seasonId);
  if (seasonLeagueId !== leagueId) {
    redirectWithFormError(
      `/leagues/${leagueId}/claim`,
      "Season not found in this league.",
    );
  }

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team || team.seasonId !== seasonId) {
    redirectWithFormError(`/leagues/${leagueId}/claim`, "Team not found.");
  }

  const alreadyManages = await userManagesTeamInSeason(user.id, seasonId);
  if (!canUserClaimTeam(team, user, alreadyManages)) {
    redirectWithFormError(
      `/leagues/${leagueId}/claim`,
      "You cannot claim this team.",
    );
  }

  const updated = await db
    .update(teams)
    .set({ managerUserId: user.id })
    .where(and(eq(teams.id, teamId), isNull(teams.managerUserId)))
    .returning({ id: teams.id });

  if (updated.length === 0) {
    redirectWithFormError(
      `/leagues/${leagueId}/claim`,
      "Someone else claimed this team just now.",
    );
  }

  await db
    .insert(leagueMembers)
    .values({ leagueId, userId: user.id, role: "manager" })
    .onConflictDoNothing();

  revalidatePath(`/leagues/${leagueId}`, "layout");
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(
    `/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}?m=claimed`,
  );
}
