export type TradeRequestDisplay = {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  proposedByUserId: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  offeredInstanceIds: string[];
  requestedInstanceIds: string[];
  message: string | null;
  createdAt: Date;
};

export type TradeRosterInstance = {
  id: string;
  teamId: string | null;
  copyIndex: number;
  characterId: string;
  displayName: string;
};

export function describeTradeInstances(
  instanceIds: string[],
  roster: TradeRosterInstance[],
): string[] {
  const byId = new Map(roster.map((row) => [row.id, row]));
  return instanceIds.map((id) => {
    const row = byId.get(id);
    if (!row) return "Unknown player";
    const suffix = row.copyIndex > 0 ? ` #${row.copyIndex + 1}` : "";
    return `${row.displayName}${suffix}`;
  });
}
