function inkyConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function inkyAutoDraftGameEnabled(): boolean {
  const explicit = process.env.INKY_AUTO_DRAFT_GAME?.trim();
  if (explicit === "0" || explicit === "false") return false;
  if (explicit === "1" || explicit === "true") return true;
  return inkyConfigured();
}

export function inkyAutoDraftSeriesEnabled(): boolean {
  const explicit = process.env.INKY_AUTO_DRAFT_SERIES?.trim();
  if (explicit === "1" || explicit === "true") return true;
  if (explicit === "0" || explicit === "false") return false;
  return inkyAutoDraftGameEnabled();
}
