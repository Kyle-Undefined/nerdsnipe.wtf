import { XMLParser } from "fast-xml-parser";
import { mergeEpisodes, type Episode } from "./cache";

const RSS_URL = "https://anchor.fm/s/1112097e0/podcast/rss";
const ITUNES_URL = "https://itunes.apple.com/lookup?id=1892197141&entity=podcastEpisode&limit=200";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function parseDuration(raw: string | number | undefined): string {
  if (!raw) return "0:00:00";
  const s = String(raw).trim();
  // already HH:MM:SS or MM:SS
  if (s.includes(":")) return s.includes(":") && s.split(":").length === 2 ? `0:${s}` : s;
  // seconds only
  const secs = parseInt(s, 10);
  if (isNaN(secs)) return "0:00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const sec = secs % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export async function fetchRss(): Promise<Episode[]> {
  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

  const xml = await res.text();
  const data = parser.parse(xml);
  const items: unknown[] = data?.rss?.channel?.item ?? [];

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
      const audioUrl = enclosure?.["@_url"] ?? "";

      // pubDate from RSS is like "Tue, 22 Apr 2026 12:00:00 +0000"
      const pubDate = i.pubDate ? new Date(String(i.pubDate)) : new Date(0);
      const date = pubDate.toISOString().slice(0, 10);

      const raw = i["itunes:duration"];
      const duration = parseDuration(
        typeof raw === "string" || typeof raw === "number" ? raw : undefined,
      );

      // strip HTML from description
      const desc = String((i["content:encoded"] as string) ?? i.description ?? "").replace(
        /<[^>]+>/g,
        "",
      );

      return {
        id: String(guid),
        num,
        title: String(i.title ?? ""),
        date,
        duration,
        description: desc.slice(0, 800),
        audioUrl,
      };
    })
    .filter((e): e is Episode => e !== null && e.title !== "");
}

// match Apple Podcasts track IDs to episodes by title similarity
export async function enrichWithApple(episodes: Episode[]): Promise<Episode[]> {
  try {
    const res = await fetch(ITUNES_URL);
    if (!res.ok) return episodes;
    const data = (await res.json()) as { results: Array<Record<string, unknown>> };
    const tracks = data.results ?? [];

    const enriched = episodes.map((ep) => {
      const match = tracks.find((t) => {
        const trackName = String(t.trackName ?? "").toLowerCase();
        const epTitle = ep.title.toLowerCase();
        return trackName.includes(epTitle.slice(0, 30)) || epTitle.includes(trackName.slice(0, 30));
      });
      if (!match) return ep;
      const trackId = match.trackId;
      return {
        ...ep,
        appleUrl: `https://podcasts.apple.com/us/podcast/id1892197141?i=${trackId}`,
      };
    });

    return enriched;
  } catch (err) {
    console.warn("Apple Podcasts enrichment failed:", err);
    return episodes;
  }
}

// called on startup and every 30 min
export async function syncRss(): Promise<void> {
  try {
    console.log("[rss] syncing...");
    let episodes = await fetchRss();
    episodes = await enrichWithApple(episodes);
    await mergeEpisodes(episodes);
    console.log(`[rss] synced ${episodes.length} episodes`);
  } catch (err) {
    console.error("[rss] sync failed:", err);
  }
}
