import Link from "next/link";
import { CharacterIcon } from "@/components/CharacterIcon";

export function characterPageHref(input: {
  charId: string;
  leagueId?: string;
  seasonId?: string;
  tab?: "pitching";
}): string {
  const base = input.leagueId
    ? `/leagues/${input.leagueId}/characters/${encodeURIComponent(input.charId)}`
    : `/characters/${encodeURIComponent(input.charId)}`;
  const params = new URLSearchParams();
  if (input.seasonId) params.set("season", input.seasonId);
  if (input.tab) params.set("tab", input.tab);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

type Props = {
  charId: string;
  /** Rendered label; pass the copy-numbered name where duplicates exist. */
  displayName: string;
  leagueId?: string;
  seasonId?: string;
  tab?: "pitching";
  iconSize?: number;
  className?: string;
};

/** Character icon + name linking to the character page (league or global). */
export function CharacterLink({
  charId,
  displayName,
  leagueId,
  seasonId,
  tab,
  iconSize = 24,
  className = "",
}: Props) {
  return (
    <Link
      href={characterPageHref({ charId, leagueId, seasonId, tab })}
      className={`inline-flex items-center gap-1.5 hover:underline ${className}`}
    >
      <CharacterIcon charId={charId} size={iconSize} />
      <span>{displayName}</span>
    </Link>
  );
}
