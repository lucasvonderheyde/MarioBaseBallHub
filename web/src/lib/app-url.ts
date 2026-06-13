import "server-only";

/** Canonical site URL for emails and OAuth redirects. */
export function getAppUrl(fallbackOrigin?: string): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  return "http://localhost:3000";
}
