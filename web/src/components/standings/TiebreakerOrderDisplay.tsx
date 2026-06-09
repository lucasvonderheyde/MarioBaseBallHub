import { AbbrTooltip } from "@/components/stats/AbbrTooltip";
import {
  TIEBREAKER_DESCRIPTIONS,
  TIEBREAKER_LABELS,
  type TiebreakerKey,
} from "@/domain/standings/tiebreakers";

type Props = {
  order: TiebreakerKey[];
};

export function TiebreakerOrderDisplay({ order }: Props) {
  return (
    <>
      {order.map((key, index) => (
        <span key={key}>
          {index > 0 ? " → " : null}
          <AbbrTooltip
            label={TIEBREAKER_LABELS[key]}
            description={TIEBREAKER_DESCRIPTIONS[key]}
          />
        </span>
      ))}
    </>
  );
}
