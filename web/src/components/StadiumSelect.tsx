import { STADIUM_CATALOG } from "@/data/character-catalog";

type Props = {
  name?: string;
  id?: string;
  defaultValue?: string | null;
  className?: string;
};

const stadiumOptions = [...STADIUM_CATALOG].sort((a, b) =>
  a.gameStadiumId.localeCompare(b.gameStadiumId),
);

const defaultClassName =
  "rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-200";

export function StadiumSelect({
  name = "homeStadium",
  id,
  defaultValue,
  className,
}: Props) {
  const selected = defaultValue ?? "";
  const catalogIds = new Set(stadiumOptions.map((stadium) => stadium.gameStadiumId));
  const legacyValue =
    selected && !catalogIds.has(selected) ? selected : null;

  return (
    <select
      id={id}
      name={name}
      defaultValue={selected}
      className={className ?? defaultClassName}
    >
      <option value="">None</option>
      {legacyValue ? (
        <option value={legacyValue}>{legacyValue} (custom)</option>
      ) : null}
      {stadiumOptions.map((stadium) => (
        <option key={stadium.gameStadiumId} value={stadium.gameStadiumId}>
          {stadium.gameStadiumId}
        </option>
      ))}
    </select>
  );
}
