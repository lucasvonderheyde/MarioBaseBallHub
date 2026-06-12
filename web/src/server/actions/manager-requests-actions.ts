"use server";

import crypto from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  gameScheduleProposals,
  rosterInstances,
  scheduleGames,
  teams,
  tradeRequests,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getManagedTeamInSeason } from "@/lib/manager-team";
import {
  countTeamRosterInstances,
  minimumRosterError,
  MIN_TEAM_ROSTER_SIZE,
  rosterCountAfterTrade,
} from "@/lib/roster-rules";
import { postDiscordMessage } from "@/lib/discord";
import { createNotification } from "@/lib/notifications";
import { recordSeasonEvent } from "@/lib/season-events";
import { parseTradeInstanceIds } from "@/lib/trade-requests";

function parseLocalDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

async function loadGameManagers(gameId: string) {
  const [game] = await db
    .select()
    .from(scheduleGames)
    .where(eq(scheduleGames.id, gameId))
    .limit(1);
  if (!game) return null;

  const [awayTeam] = await db
    .select({ managerUserId: teams.managerUserId, name: teams.name })
    .from(teams)
    .where(eq(teams.id, game.awayTeamId))
    .limit(1);
  const [homeTeam] = await db
    .select({ managerUserId: teams.managerUserId, name: teams.name })
    .from(teams)
    .where(eq(teams.id, game.homeTeamId))
    .limit(1);

  return {
    game,
    homeManagerUserId: homeTeam?.managerUserId ?? null,
    awayManagerUserId: awayTeam?.managerUserId ?? null,
    homeTeamName: homeTeam?.name ?? "Home",
    awayTeamName: awayTeam?.name ?? "Away",
  };
}

function userManagesGame(
  userId: string,
  homeManagerUserId: string | null,
  awayManagerUserId: string | null,
): boolean {
  return userId === homeManagerUserId || userId === awayManagerUserId;
}

function revalidateSeasonPaths(leagueId: string, seasonId: string) {
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`);
  revalidatePath(`/leagues/${leagueId}/schedule`);
}

export async function proposeGameTimeAction(input: {
  gameId: string;
  leagueId: string;
  seasonId: string;
  proposedPlayAt: string;
  note?: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (!role) return { error: "Forbidden." };

  const proposedPlayAt = parseLocalDateTime(input.proposedPlayAt);
  if (!proposedPlayAt) return { error: "Enter a valid date and time." };
  if (proposedPlayAt.getTime() <= Date.now()) {
    return { error: "Proposed time must be in the future." };
  }

  const loaded = await loadGameManagers(input.gameId);
  if (!loaded || loaded.game.statsRawJson) {
    return { error: "Game not found or already completed." };
  }
  if (
    !userManagesGame(
      user.id,
      loaded.homeManagerUserId,
      loaded.awayManagerUserId,
    )
  ) {
    return { error: "Only managers in this matchup can propose a time." };
  }

  const [pending] = await db
    .select()
    .from(gameScheduleProposals)
    .where(
      and(
        eq(gameScheduleProposals.gameId, input.gameId),
        eq(gameScheduleProposals.status, "pending"),
      ),
    )
    .limit(1);

  if (pending && pending.proposedByUserId !== user.id) {
    return { error: "Respond to the pending proposal before proposing a new time." };
  }

  if (pending) {
    await db
      .update(gameScheduleProposals)
      .set({ status: "cancelled", respondedByUserId: user.id, respondedAt: new Date() })
      .where(eq(gameScheduleProposals.id, pending.id));
  }

  await db.insert(gameScheduleProposals).values({
    id: crypto.randomUUID(),
    seasonId: input.seasonId,
    gameId: input.gameId,
    proposedByUserId: user.id,
    proposedPlayAt,
    note: input.note?.trim() || null,
    status: "pending",
    createdAt: new Date(),
  });

  const opponentUserId =
    loaded.homeManagerUserId === user.id
      ? loaded.awayManagerUserId
      : loaded.homeManagerUserId;
  if (opponentUserId) {
    await createNotification({
      userId: opponentUserId,
      type: "schedule_proposal",
      message: `${user.displayName ?? user.username} proposed ${proposedPlayAt.toLocaleString()} for ${loaded.awayTeamName} @ ${loaded.homeTeamName}.`,
      href: `/leagues/${input.leagueId}/seasons/${input.seasonId}/games/${input.gameId}`,
    });
  }

  revalidateSeasonPaths(input.leagueId, input.seasonId);
  return {};
}

export async function respondGameScheduleAction(input: {
  proposalId: string;
  leagueId: string;
  seasonId: string;
  decision: "accept" | "decline";
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (!role) return { error: "Forbidden." };

  const [proposal] = await db
    .select()
    .from(gameScheduleProposals)
    .where(
      and(
        eq(gameScheduleProposals.id, input.proposalId),
        eq(gameScheduleProposals.seasonId, input.seasonId),
        eq(gameScheduleProposals.status, "pending"),
      ),
    )
    .limit(1);
  if (!proposal) return { error: "Proposal not found." };
  if (proposal.proposedByUserId === user.id) {
    return { error: "You cannot respond to your own proposal." };
  }

  const loaded = await loadGameManagers(proposal.gameId);
  if (!loaded) return { error: "Game not found." };
  if (
    !userManagesGame(
      user.id,
      loaded.homeManagerUserId,
      loaded.awayManagerUserId,
    )
  ) {
    return { error: "Only managers in this matchup can respond." };
  }

  const now = new Date();
  const gameHref = `/leagues/${input.leagueId}/seasons/${input.seasonId}/games/${proposal.gameId}`;
  if (input.decision === "decline") {
    await db
      .update(gameScheduleProposals)
      .set({
        status: "declined",
        respondedByUserId: user.id,
        respondedAt: now,
      })
      .where(eq(gameScheduleProposals.id, proposal.id));
    await createNotification({
      userId: proposal.proposedByUserId,
      type: "schedule_declined",
      message: `${user.displayName ?? user.username} declined your proposed time for ${loaded.awayTeamName} @ ${loaded.homeTeamName}.`,
      href: gameHref,
    });
    revalidateSeasonPaths(input.leagueId, input.seasonId);
    return {};
  }

  await db
    .update(gameScheduleProposals)
    .set({
      status: "accepted",
      respondedByUserId: user.id,
      respondedAt: now,
    })
    .where(eq(gameScheduleProposals.id, proposal.id));

  await db
    .update(scheduleGames)
    .set({ agreedPlayAt: proposal.proposedPlayAt })
    .where(eq(scheduleGames.id, proposal.gameId));

  await db
    .update(gameScheduleProposals)
    .set({ status: "cancelled", respondedAt: now })
    .where(
      and(
        eq(gameScheduleProposals.gameId, proposal.gameId),
        eq(gameScheduleProposals.status, "pending"),
      ),
    );

  const when = proposal.proposedPlayAt.toLocaleString();
  await recordSeasonEvent({
    seasonId: input.seasonId,
    eventType: "schedule_agreed",
    message: `${loaded.awayTeamName} @ ${loaded.homeTeamName} scheduled for ${when}.`,
    relatedGameId: proposal.gameId,
  });
  await createNotification({
    userId: proposal.proposedByUserId,
    type: "schedule_agreed",
    message: `${user.displayName ?? user.username} accepted ${when} for ${loaded.awayTeamName} @ ${loaded.homeTeamName}.`,
    href: gameHref,
  });
  await postDiscordMessage(
    `📅 **Game scheduled** — ${loaded.awayTeamName} @ ${loaded.homeTeamName} on ${when}`,
  );

  revalidateSeasonPaths(input.leagueId, input.seasonId);
  return {};
}

async function validateTradeInstances(
  seasonId: string,
  fromTeamId: string,
  toTeamId: string,
  offeredIds: string[],
  requestedIds: string[],
): Promise<{ error?: string }> {
  if (offeredIds.length === 0 && requestedIds.length === 0) {
    return { error: "Select at least one player to offer or request." };
  }

  const allIds = [...offeredIds, ...requestedIds];
  const rows = await db
    .select({
      id: rosterInstances.id,
      teamId: rosterInstances.teamId,
    })
    .from(rosterInstances)
    .where(
      and(
        eq(rosterInstances.seasonId, seasonId),
        inArray(rosterInstances.id, allIds),
      ),
    );

  if (rows.length !== allIds.length) {
    return { error: "One or more roster players were not found." };
  }

  for (const id of offeredIds) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.teamId !== fromTeamId) {
      return { error: "Offered players must be on your team." };
    }
  }
  for (const id of requestedIds) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.teamId !== toTeamId) {
      return { error: "Requested players must be on the other team." };
    }
  }

  const [fromTeam] = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, fromTeamId))
    .limit(1);
  const [toTeam] = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, toTeamId))
    .limit(1);

  const fromCount = await countTeamRosterInstances(fromTeamId);
  const toCount = await countTeamRosterInstances(toTeamId);
  const fromAfter = rosterCountAfterTrade(
    fromCount,
    offeredIds.length,
    requestedIds.length,
  );
  const toAfter = rosterCountAfterTrade(
    toCount,
    requestedIds.length,
    offeredIds.length,
  );

  if (fromAfter < MIN_TEAM_ROSTER_SIZE) {
    return { error: minimumRosterError(fromTeam?.name) };
  }
  if (toAfter < MIN_TEAM_ROSTER_SIZE) {
    return { error: minimumRosterError(toTeam?.name) };
  }

  return {};
}

export async function proposeTradeAction(input: {
  leagueId: string;
  seasonId: string;
  toTeamId: string;
  offeredInstanceIds: string[];
  requestedInstanceIds: string[];
  message?: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (!role) return { error: "Forbidden." };

  const userTeam = await getManagedTeamInSeason(user.id, input.seasonId);
  if (!userTeam) return { error: "You must manage a team to propose a trade." };
  if (userTeam.id === input.toTeamId) {
    return { error: "Choose a different team to trade with." };
  }

  const validation = await validateTradeInstances(
    input.seasonId,
    userTeam.id,
    input.toTeamId,
    input.offeredInstanceIds,
    input.requestedInstanceIds,
  );
  if (validation.error) return validation;

  await db.insert(tradeRequests).values({
    id: crypto.randomUUID(),
    seasonId: input.seasonId,
    fromTeamId: userTeam.id,
    toTeamId: input.toTeamId,
    proposedByUserId: user.id,
    status: "pending",
    offeredInstanceIds: JSON.stringify(input.offeredInstanceIds),
    requestedInstanceIds: JSON.stringify(input.requestedInstanceIds),
    message: input.message?.trim() || null,
    createdAt: new Date(),
  });

  const [targetTeam] = await db
    .select({ managerUserId: teams.managerUserId, name: teams.name })
    .from(teams)
    .where(eq(teams.id, input.toTeamId))
    .limit(1);
  if (targetTeam?.managerUserId) {
    await createNotification({
      userId: targetTeam.managerUserId,
      type: "trade_proposal",
      message: `${userTeam.name} proposed a trade with ${targetTeam.name}.`,
      href: `/leagues/${input.leagueId}/seasons/${input.seasonId}`,
    });
  }

  revalidateSeasonPaths(input.leagueId, input.seasonId);
  return {};
}

export async function respondTradeAction(input: {
  tradeId: string;
  leagueId: string;
  seasonId: string;
  decision: "accept" | "decline";
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (!role) return { error: "Forbidden." };

  const [trade] = await db
    .select()
    .from(tradeRequests)
    .where(
      and(
        eq(tradeRequests.id, input.tradeId),
        eq(tradeRequests.seasonId, input.seasonId),
        eq(tradeRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (!trade) return { error: "Trade request not found." };

  const [toTeam] = await db
    .select({ managerUserId: teams.managerUserId, name: teams.name })
    .from(teams)
    .where(eq(teams.id, trade.toTeamId))
    .limit(1);
  if (!toTeam || toTeam.managerUserId !== user.id) {
    return { error: "Only the receiving team's manager can respond." };
  }

  const now = new Date();
  const seasonHref = `/leagues/${input.leagueId}/seasons/${input.seasonId}`;
  if (input.decision === "decline") {
    await db
      .update(tradeRequests)
      .set({
        status: "declined",
        respondedByUserId: user.id,
        respondedAt: now,
      })
      .where(eq(tradeRequests.id, trade.id));
    await createNotification({
      userId: trade.proposedByUserId,
      type: "trade_declined",
      message: `${toTeam.name} declined your trade offer.`,
      href: seasonHref,
    });
    revalidateSeasonPaths(input.leagueId, input.seasonId);
    return {};
  }

  const offeredIds = parseTradeInstanceIds(trade.offeredInstanceIds);
  const requestedIds = parseTradeInstanceIds(trade.requestedInstanceIds);
  const validation = await validateTradeInstances(
    input.seasonId,
    trade.fromTeamId,
    trade.toTeamId,
    offeredIds,
    requestedIds,
  );
  if (validation.error) return validation;

  for (const id of offeredIds) {
    await db
      .update(rosterInstances)
      .set({ teamId: trade.toTeamId })
      .where(eq(rosterInstances.id, id));
  }
  for (const id of requestedIds) {
    await db
      .update(rosterInstances)
      .set({ teamId: trade.fromTeamId })
      .where(eq(rosterInstances.id, id));
  }

  await db
    .update(tradeRequests)
    .set({
      status: "accepted",
      respondedByUserId: user.id,
      respondedAt: now,
    })
    .where(eq(tradeRequests.id, trade.id));

  const [fromTeam] = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, trade.fromTeamId))
    .limit(1);

  await recordSeasonEvent({
    seasonId: input.seasonId,
    eventType: "trade_completed",
    message: `Trade completed: ${fromTeam?.name ?? "Team"} ↔ ${toTeam.name}.`,
  });
  await createNotification({
    userId: trade.proposedByUserId,
    type: "trade_accepted",
    message: `${toTeam.name} accepted your trade offer.`,
    href: `${seasonHref}/rosters`,
  });
  await postDiscordMessage(
    `🔁 **Trade completed** — ${fromTeam?.name ?? "Team"} ↔ ${toTeam.name}`,
  );

  revalidateSeasonPaths(input.leagueId, input.seasonId);
  revalidatePath(`/leagues/${input.leagueId}/seasons/${input.seasonId}/rosters`);
  return {};
}

export async function rescindTradeAction(input: {
  tradeId: string;
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (!role) return { error: "Forbidden." };

  const [trade] = await db
    .select()
    .from(tradeRequests)
    .where(
      and(
        eq(tradeRequests.id, input.tradeId),
        eq(tradeRequests.seasonId, input.seasonId),
        eq(tradeRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (!trade) return { error: "Trade request not found." };

  const [fromTeam] = await db
    .select({ managerUserId: teams.managerUserId })
    .from(teams)
    .where(eq(teams.id, trade.fromTeamId))
    .limit(1);
  if (
    trade.proposedByUserId !== user.id &&
    fromTeam?.managerUserId !== user.id
  ) {
    return { error: "Only the team that sent this offer can rescind it." };
  }

  await db
    .update(tradeRequests)
    .set({
      status: "cancelled",
      respondedByUserId: user.id,
      respondedAt: new Date(),
    })
    .where(eq(tradeRequests.id, trade.id));

  revalidateSeasonPaths(input.leagueId, input.seasonId);
  return {};
}
