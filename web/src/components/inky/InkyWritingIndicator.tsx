import Image from "next/image";
import {
  INKY_DISPLAY_NAME,
  INKY_PROFILE_IMAGE,
} from "@/domain/inky/inky-persona";

type Props = {
  message?: string;
  compact?: boolean;
};

export function InkyWritingIndicator({
  message = "Inky is filing a story from the press box…",
  compact = false,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={
        compact
          ? "mb-4 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3"
          : "msb-empty-state"
      }
    >
      <div className={`flex flex-col items-center ${compact ? "gap-3 sm:flex-row" : "gap-4"}`}>
        <div className="relative shrink-0">
          <div className="inky-writing-ring absolute inset-0 rounded-full" aria-hidden />
          <Image
            src={INKY_PROFILE_IMAGE}
            alt={INKY_DISPLAY_NAME}
            width={compact ? 48 : 64}
            height={compact ? 48 : 64}
            className="relative rounded-full border-2 border-amber-700/50 object-cover"
          />
        </div>

        <div className={compact ? "min-w-0 text-left" : "text-center"}>
          <p className={`font-medium text-amber-100 ${compact ? "text-sm" : "text-base"}`}>
            {message}
          </p>
          <div
            className={`mt-2 flex items-center gap-1 ${compact ? "" : "justify-center"}`}
            aria-hidden
          >
            <span className="inky-writing-dot h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="inky-writing-dot h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="inky-writing-dot h-1.5 w-1.5 rounded-full bg-amber-400" />
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="mx-auto mt-6 max-w-xs space-y-2" aria-hidden>
          <div className="inky-writing-line h-2 rounded bg-zinc-800/80" />
          <div className="inky-writing-line h-2 rounded bg-zinc-800/60" />
          <div className="inky-writing-line h-2 rounded bg-zinc-800/40" />
        </div>
      ) : null}
    </div>
  );
}
