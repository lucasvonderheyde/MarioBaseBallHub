/**
 * Static mugshots and stadium art ship under `public/assets/` so Next serves them
 * without a custom API route.
 */
export function characterMugshotUrl(filename: string): string {
  return `/assets/characters/${encodeURIComponent(filename)}`;
}

export function stadiumIconUrl(filename: string): string {
  return `/assets/stadiums/${encodeURIComponent(filename)}`;
}
