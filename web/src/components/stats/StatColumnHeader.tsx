import { statDescription } from "@/domain/stats/stat-glossary";
import { AbbrTooltip } from "@/components/stats/AbbrTooltip";

type Props = {
  abbr: string;
  className?: string;
  /** Override glossary text (e.g. context-specific G column). */
  description?: string;
};

export function StatColumnHeader({ abbr, className = "py-1 pr-2", description }: Props) {
  const tooltip = description ?? statDescription(abbr);

  return (
    <th className={className}>
      {tooltip ? (
        <AbbrTooltip label={abbr} description={tooltip} />
      ) : (
        abbr
      )}
    </th>
  );
}
