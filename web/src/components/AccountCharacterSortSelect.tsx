"use client";

import { useRouter } from "next/navigation";

type SortOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  paramName: string;
  value: T;
  defaultValue: T;
  options: SortOption<T>[];
};

export function AccountCharacterSortSelect<T extends string>({
  paramName,
  value,
  defaultValue,
  options,
}: Props<T>) {
  const router = useRouter();

  function onChange(next: T) {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "stats");
    params.set("section", "characters");
    if (next === defaultValue) {
      params.delete(paramName);
    } else {
      params.set(paramName, next);
    }
    const query = params.toString();
    router.push(`/account${query ? `?${query}` : ""}`);
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500">Sort by</span>
      <select
        value={value}
        className="min-w-[10rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.value !== "name" ? " (high → low)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
