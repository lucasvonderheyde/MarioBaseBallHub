/** Canonical site URL for emails and password-reset links. */
export function getAppUrl(fallbackOrigin?: string): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  return "http://localhost:3000";
}

function isInternalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * OAuth redirect/callback URI base URL.
 * Prefer the browser origin locally; on Railway the request origin is often
 * an internal bind address (e.g. localhost:8080), so fall back to APP_URL.
 */
export function getOAuthAppUrl(requestOrigin: string): string {
  const origin = requestOrigin.replace(/\/$/, "");
  const configured = process.env.APP_URL?.trim()?.replace(/\/$/, "");

  if (configured && isInternalDevOrigin(origin)) {
    return configured;
  }

  return origin;
}
