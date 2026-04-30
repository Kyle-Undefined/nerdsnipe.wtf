import { join } from "path";
import { mkdirSync } from "node:fs";

const DATA_DIR = join(import.meta.dir, "../../data");
const CACHE_PATH = join(DATA_DIR, "episodes.json");

mkdirSync(DATA_DIR, { recursive: true });

export interface Episode {
  id: string;
  num: string;
  title: string;
  date: string;
  duration: string;
  description: string;
  audioUrl: string;
  imageUrl?: string;
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

// serializes concurrent reads/writes — prevents interleaved file corruption
// and lost updates in mergeEpisodes' read-modify-write cycle.
let cacheLock: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = cacheLock.catch(() => {}).then(fn);
  cacheLock = next.catch(() => {});
  return next;
}

export async function writeCache(episodes: Episode[]): Promise<void> {
  return withLock(async () => {
    await Bun.write(CACHE_PATH, JSON.stringify(episodes, null, 2));
  });
}

// merge incoming episodes with what we have — never deletes, always updates.
// the entire read-modify-write must be serialized so concurrent calls don't
// clobber each other's updates.
export async function mergeEpisodes(incoming: Episode[]): Promise<Episode[]> {
  return withLock(async () => {
    const existing = await readCache();
    const byId = new Map(existing.map((e) => [e.id, e]));

    for (const ep of incoming) {
      const prev = byId.get(ep.id);
      // preserve ytUrl and appleUrl that came from other sources
      byId.set(ep.id, {
        ...ep,
        imageUrl: ep.imageUrl ?? prev?.imageUrl,
        ytUrl: ep.ytUrl ?? prev?.ytUrl,
        appleUrl: ep.appleUrl ?? prev?.appleUrl,
      });
    }

    const merged = Array.from(byId.values()).sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (isNaN(ta) && isNaN(tb)) return 0;
      if (isNaN(ta)) return 1;
      if (isNaN(tb)) return -1;
      return tb - ta;
    });

    await Bun.write(CACHE_PATH, JSON.stringify(merged, null, 2));
    return merged;
  });
}
