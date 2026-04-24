import { join } from "path";

const CACHE_PATH = join(import.meta.dir, "../../data/episodes.json");

export interface Episode {
  id: string;
  num: string;
  title: string;
  date: string;
  duration: string;
  description: string;
  audioUrl: string;
  ytUrl?: string;
  appleUrl?: string;
}

export async function readCache(): Promise<Episode[]> {
  try {
    const file = Bun.file(CACHE_PATH);
    if (!(await file.exists())) return [];
    return await file.json();
  } catch {
    return [];
  }
}

export async function writeCache(episodes: Episode[]): Promise<void> {
  await Bun.write(CACHE_PATH, JSON.stringify(episodes, null, 2));
}

// merge incoming episodes with what we have — never deletes, always updates
export async function mergeEpisodes(incoming: Episode[]): Promise<Episode[]> {
  const existing = await readCache();
  const byId = new Map(existing.map((e) => [e.id, e]));

  for (const ep of incoming) {
    const prev = byId.get(ep.id);
    // preserve ytUrl and appleUrl that came from other sources
    byId.set(ep.id, {
      ...ep,
      ytUrl: ep.ytUrl ?? prev?.ytUrl,
      appleUrl: ep.appleUrl ?? prev?.appleUrl,
    });
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  await writeCache(merged);
  return merged;
}

export async function patchEpisodeYt(episodeId: string, ytUrl: string): Promise<void> {
  const episodes = await readCache();
  const ep = episodes.find((e) => e.id === episodeId);
  if (!ep) return;
  ep.ytUrl = ytUrl;
  await writeCache(episodes);
}
