"use client";

import { useState } from "react";
import { characterMugshotUrl } from "@/lib/asset-urls";
import { mugshotFileForCharId } from "@/lib/character-display";

type Props = {
  charId: string;
  size?: number;
  className?: string;
  displayName?: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function CharacterMugshot({
  charId,
  size = 28,
  className = "rounded-full",
  displayName,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const file = mugshotFileForCharId(charId);
  const label = displayName ?? charId;
  const initials = initialsFromName(label);

  if (!file || imageFailed) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-amber-950/40 font-medium text-msb-gold-bright ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        aria-hidden
      >
        {initials || "?"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={characterMugshotUrl(file)}
      alt=""
      width={size}
      height={size}
      className={className}
      onError={() => setImageFailed(true)}
    />
  );
}
