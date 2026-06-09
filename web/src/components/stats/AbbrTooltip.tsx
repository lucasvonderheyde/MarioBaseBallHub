type Props = {
  label: string;
  description: string;
  className?: string;
};

/** Small dotted underline + hover/focus tooltip for abbreviations. */
export function AbbrTooltip({ label, description, className }: Props) {
  return (
    <span
      className={`group/abbr relative inline-block cursor-help border-b border-dotted border-zinc-600/80 ${className ?? ""}`}
      title={description}
      tabIndex={0}
    >
      {label}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-0.5 hidden w-max max-w-[12rem] rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-normal normal-case leading-snug text-zinc-300 shadow-md group-hover/abbr:block group-focus-visible/abbr:block"
      >
        {description}
      </span>
    </span>
  );
}
