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
 * OAuth redirect/callback URI base URL from a raw origin string.
 * On Railway the origin is often an internal bind address (localhost:8080).
 */
export function getOAuthAppUrl(requestOrigin: string): string {
  const origin = requestOrigin.replace(/\/$/, "");
  const configured = process.env.APP_URL?.trim()?.replace(/\/$/, "");

  if (configured && isInternalDevOrigin(origin)) {
    return configured;
  }

  return origin;
}

type PublicUrlRequest = {
  headers: { get(name: string): string | null };
  nextUrl: { origin: string };
};

/** Public site origin behind Railway/proxy headers, for redirects and OAuth. */
export function getPublicOrigin(request: PublicUrlRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return getOAuthAppUrl(request.nextUrl.origin);
}

export function publicUrlForRequest(request: PublicUrlRequest, path: string): URL {
  return new URL(path, `${getPublicOrigin(request)}/`);
}
