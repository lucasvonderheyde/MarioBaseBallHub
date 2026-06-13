/**
 * Posts league events to a Discord channel via webhook. Set
 * DISCORD_WEBHOOK_URL (server-only) to enable; without it this is a no-op.
 * Failures are logged and swallowed so site actions never break on Discord.
 */
export async function postDiscordMessage(content: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Discord webhook responded ${response.status}`);
    }
  } catch (error) {
    console.error("Discord webhook failed", error);
  }
}

/** Morning Star articles — prefers DISCORD_NEWS_WEBHOOK_URL, falls back to main webhook. */
export async function postDiscordNewsMessage(content: string): Promise<void> {
  const webhookUrl =
    process.env.DISCORD_NEWS_WEBHOOK_URL?.trim() ||
    process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Discord news webhook responded ${response.status}`);
    }
  } catch (error) {
    console.error("Discord news webhook failed", error);
  }
}
