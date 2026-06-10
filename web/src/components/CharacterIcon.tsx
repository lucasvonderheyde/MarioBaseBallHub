"use client";

import { useState } from "react";
import { characterIconUrl, characterMugshotUrl } from "@/lib/asset-urls";
import { iconFileForCharId } from "@/lib/character-assets";
import { mugshotFileForCharId } from "@/lib/character-display";

type Props = {
  charId: string;
  size?: number;
  className?: string;
  displayName?: string;
};

type ImageStage = "icon" | "mugshot" | "fallback";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Compact in-game icon for tables, lists, and roster rows. */
export function CharacterIcon({
  charId,
  size = 28,
  className = "rounded-sm",
  displayName,
}: Props) {
  const iconFile = iconFileForCharId(charId);
  const mugshotFile = mugshotFileForCharId(charId);
  const [stage, setStage] = useState<ImageStage>(
    iconFile ? "icon" : mugshotFile ? "mugshot" : "fallback",
  );

  const label = displayName ?? charId;
  const initials = initialsFromName(label);

  if (stage === "fallback") {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center bg-amber-950/40 font-medium text-msb-gold-bright ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        aria-hidden
      >
        {initials || "?"}
      </span>
    );
  }

  const file = stage === "icon" ? iconFile : mugshotFile;
  if (!file) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center bg-amber-950/40 font-medium text-msb-gold-bright ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        aria-hidden
      >
        {initials || "?"}
      </span>
    );
  }

  const src =
    stage === "icon" ? characterIconUrl(file) : characterMugshotUrl(file);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      onError={() => {
        if (stage === "icon" && mugshotFile) {
          setStage("mugshot");
          return;
        }
        setStage("fallback");
      }}
    />
  );
}
