/** Extract a YouTube video id from common watch, short, and embed URLs. */
export function parseYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      const embedMatch = /^\/embed\/([^/?]+)/.exec(parsed.pathname);
      if (embedMatch) return embedMatch[1] ?? null;
      const shortsMatch = /^\/shorts\/([^/?]+)/.exec(parsed.pathname);
      if (shortsMatch) return shortsMatch[1] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
