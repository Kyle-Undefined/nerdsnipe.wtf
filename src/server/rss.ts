import { XMLParser } from "fast-xml-parser";
import { mergeEpisodes, type Episode } from "./cache";

const RSS_URL = "https://anchor.fm/s/1112097e0/podcast/rss";
const ITUNES_URL = "https://itunes.apple.com/lookup?id=1892197141&entity=podcastEpisode&limit=200";
const YT_CHANNEL_ID = "UC2mPtIOYm1XihpmfrJKXjMw";
const YT_UPLOADS_PLAYLIST_ID = "UU" + YT_CHANNEL_ID.slice(2);
const YT_RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`;
const YT_API_BASE = "https://www.googleapis.com/youtube/v3/playlistItems";

// manual ytUrl overrides for episodes not on the main channel (e.g. ep 001
// lived on a host's main channel). keyed by episode guid (RSS id).
const YT_URL_OVERRIDES: Record<string, string> = {
  "c3c0ce4f-9e9e-4217-917e-615cf020ca59": "https://www.youtube.com/watch?v=3DNkDIVKtK8",
};

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function parseDuration(raw: string | number | undefined): string {
  if (!raw) return "0:00:00";
  const s = String(raw).trim();
  // already HH:MM:SS or MM:SS — pad MM:SS up to H:MM:SS
  if (s.includes(":")) return s.split(":").length === 2 ? `0:${s}` : s;
  // seconds only
  const secs = parseInt(s, 10);
  if (isNaN(secs)) return "0:00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const sec = secs % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const FETCH_TIMEOUT_MS = 15000;

function isHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

export async function fetchRss(): Promise<Episode[]> {
  const res = await fetch(RSS_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

  const xml = await res.text();
  const data = parser.parse(xml);
  const channel = data?.rss?.channel ?? {};
  const channelItunesImage = (channel as Record<string, unknown>)?.["itunes:image"] as
    | Record<string, string>
    | undefined;
  const channelImage = channelItunesImage?.["@_href"];
  const items: unknown[] = channel?.item ?? [];

  return items
    .map((item: unknown): Episode | null => {
      const i = item as Record<string, unknown>;
      const guid =
        typeof i.guid === "object" && i.guid !== null
          ? ((i.guid as Record<string, unknown>)["#text"] ?? String(i.guid))
          : String(i.guid ?? "");
      const epNum = i["itunes:episode"];
      const num = epNum ? String(epNum).padStart(3, "0") : "000";
      const enclosure = i.enclosure as Record<string, string> | undefined;
      const rawAudio = enclosure?.["@_url"] ?? "";
      const audioUrl = isHttpUrl(rawAudio) ? rawAudio : "";

      // pubDate from RSS is like "Tue, 22 Apr 2026 12:00:00 +0000"
      const pubDate = i.pubDate ? new Date(String(i.pubDate)) : null;
      if (!pubDate || isNaN(pubDate.getTime())) return null;
      const date = pubDate.toISOString().slice(0, 10);

      const raw = i["itunes:duration"];
      const duration = parseDuration(
        typeof raw === "string" || typeof raw === "number" ? raw : undefined,
      );

      const raw_desc = String((i["content:encoded"] as string) ?? i.description ?? "");
      const desc = raw_desc
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      const itunesImage = i["itunes:image"] as Record<string, string> | undefined;
      const rawImage = itunesImage?.["@_href"] ?? channelImage ?? "";
      const imageUrl = isHttpUrl(rawImage) ? rawImage : undefined;

      return {
        id: String(guid),
        num,
        title: String(i.title ?? ""),
        date,
        duration,
        description: desc.slice(0, 1200),
        audioUrl,
        imageUrl,
      };
    })
    .filter((e): e is Episode => e !== null && e.title !== "");
}

// match Apple Podcasts track IDs to episodes by title similarity
export async function enrichWithApple(episodes: Episode[]): Promise<Episode[]> {
  // skip the iTunes fetch entirely if every episode already has an appleUrl
  if (episodes.every((e) => e.appleUrl)) return episodes;

  try {
    const res = await fetch(ITUNES_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return episodes;
    const data = (await res.json()) as { results: Array<Record<string, unknown>> };
    const tracks = data.results ?? [];

    const candidates = tracks
      .map((t) => ({
        trackId: t.trackId,
        normTitle: normalizeTitle(String(t.trackName ?? "")),
      }))
      .filter((c) => c.trackId != null && c.normTitle.length >= 8);

    return episodes.map((ep) => {
      const epNorm = normalizeTitle(ep.title);
      if (epNorm.length < 8) return ep;

      // exact normalized match wins
      let match = candidates.find((c) => c.normTitle === epNorm);
      // fallback: substring match, but require enough overlap to avoid collisions
      if (!match) {
        match = candidates.find((c) => {
          const minLen = Math.min(c.normTitle.length, epNorm.length);
          if (minLen < 20) return false;
          return c.normTitle.includes(epNorm) || epNorm.includes(c.normTitle);
        });
      }
      if (!match) return ep;
      return {
        ...ep,
        appleUrl: `https://podcasts.apple.com/us/podcast/id1892197141?i=${match.trackId}`,
      };
    });
  } catch (err) {
    console.warn("Apple Podcasts enrichment failed:", err);
    return episodes;
  }
}

interface YTVideo {
  title: string;
  normTitle: string;
  videoId: string;
}

// fetch entire upload history via YouTube Data API. paginates through 50 at a
// time. ~1 quota unit per page; channel of any reasonable size = handful of
// units per sync, well under the 10k/day default.
async function fetchYouTubeApi(apiKey: string): Promise<YTVideo[]> {
  const videos: YTVideo[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(YT_API_BASE);
    url.searchParams.set("playlistId", YT_UPLOADS_PLAYLIST_ID);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`YT API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      items?: Array<{ snippet?: { title?: string; resourceId?: { videoId?: string } } }>;
      nextPageToken?: string;
    };
    for (const item of data.items ?? []) {
      const title = item.snippet?.title ?? "";
      const videoId = item.snippet?.resourceId?.videoId ?? "";
      if (videoId) videos.push({ title, normTitle: normalizeTitle(title), videoId });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return videos;
}

// fallback: channel RSS, last ~15 uploads only, no key required
async function fetchYouTubeRss(): Promise<YTVideo[]> {
  const res = await fetch(YT_RSS_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) return [];
  const xml = await res.text();
  const data = parser.parse(xml);
  // fast-xml-parser returns a single object for one entry, an array for many
  const rawEntries = data?.feed?.entry;
  let entries: unknown[];
  if (Array.isArray(rawEntries)) {
    entries = rawEntries;
  } else if (rawEntries) {
    entries = [rawEntries];
  } else {
    entries = [];
  }
  return entries
    .map((e) => {
      const v = e as Record<string, unknown>;
      const videoId = String(v["yt:videoId"] ?? "");
      const title = String(v.title ?? "");
      return { title, normTitle: normalizeTitle(title), videoId };
    })
    .filter((v) => v.videoId);
}

// prefers Data API when YT_API_KEY is set; falls back to channel RSS otherwise
// or on API failure
async function fetchYouTubeVideos(apiKey: string | undefined): Promise<YTVideo[]> {
  if (!apiKey) return fetchYouTubeRss();
  try {
    return await fetchYouTubeApi(apiKey);
  } catch (err) {
    console.warn("[yt] Data API failed, falling back to RSS:", err);
    return fetchYouTubeRss();
  }
}

// match YouTube videos to episodes by title similarity
export async function enrichWithYouTube(episodes: Episode[]): Promise<Episode[]> {
  // apply manual overrides first — they win over any future YT match
  episodes = episodes.map((ep) => {
    const override = YT_URL_OVERRIDES[ep.id];
    return override ? { ...ep, ytUrl: override } : ep;
  });

  // skip the YT fetch entirely if every episode already has a ytUrl
  if (episodes.every((e) => e.ytUrl)) return episodes;

  try {
    const apiKey = process.env.YT_API_KEY;
    const videos = await fetchYouTubeVideos(apiKey);

    if (videos.length === 0) return episodes;

    return episodes.map((ep) => {
      if (ep.ytUrl) return ep;
      const epNorm = normalizeTitle(ep.title);
      if (epNorm.length < 8) return ep;
      const match = videos.find(
        (v) =>
          v.normTitle.length >= 8 && (v.normTitle.includes(epNorm) || epNorm.includes(v.normTitle)),
      );
      if (!match) return ep;
      return { ...ep, ytUrl: `https://www.youtube.com/watch?v=${match.videoId}` };
    });
  } catch (err) {
    console.warn("YouTube enrichment failed:", err);
    return episodes;
  }
}

// called on startup and at the interval registered in server/index.ts
export async function syncRss(): Promise<void> {
  try {
    console.log("[rss] syncing...");
    let episodes = await fetchRss();
    episodes = await enrichWithApple(episodes);
    episodes = await enrichWithYouTube(episodes);
    await mergeEpisodes(episodes);
    console.log(`[rss] synced ${episodes.length} episodes`);
  } catch (err) {
    console.error("[rss] sync failed:", err);
  }
}
