import { patchEpisodeYt, readCache } from "./cache";

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";
// the YouTube channel feed URL is what we subscribe to
const YT_CHANNEL_ID = "UC2mPtIOYm1XihpmfrJKXjMw";
const TOPIC_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`;

// base URL where our webhook lives — set via env in production
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

// shared with webhook.ts for push signature verification
export const WEBSUB_SECRET = process.env.WEBSUB_SECRET ?? "";

export async function subscribe(): Promise<void> {
  const body = new URLSearchParams({
    "hub.callback": `${BASE_URL}/webhook`,
    "hub.topic": TOPIC_URL,
    "hub.mode": "subscribe",
    "hub.lease_seconds": String(9 * 24 * 60 * 60), // 9 days
  });

  if (WEBSUB_SECRET) body.set("hub.secret", WEBSUB_SECRET);

  try {
    const res = await fetch(HUB_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    console.log(`[websub] subscribed, hub responded ${res.status}`);
  } catch (err) {
    console.error("[websub] subscription failed:", err);
  }
}

// parse a YouTube push notification and try to match it to a cached episode
export async function handlePush(xml: string): Promise<void> {
  const videoIdMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
  const publishedMatch = xml.match(/<published>([^<]+)<\/published>/);

  if (!videoIdMatch) return;
  const videoId = videoIdMatch[1].trim();
  const publishedDate = publishedMatch
    ? new Date(publishedMatch[1]).toISOString().slice(0, 10)
    : null;

  if (!publishedDate) return;

  // match by publish date (close enough — they usually publish podcast + video same day)
  const episodes = await readCache();
  const match = episodes.find((e) => e.date === publishedDate);
  if (!match) {
    console.log(`[websub] no episode found for date ${publishedDate}, videoId ${videoId}`);
    return;
  }

  await patchEpisodeYt(match.id, `https://www.youtube.com/watch?v=${videoId}`);
  console.log(`[websub] linked ep ${match.id} → ${videoId}`);
}
