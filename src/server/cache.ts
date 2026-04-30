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

// serializes concurrent writes — prevents interleaved file corruption
let writeLock: Promise<void> = Promise.resolve();

export async function writeCache(episodes: Episode[]): Promise<void> {
  writeLock = writeLock
    .catch(() => {})
    .then(() => Bun.write(CACHE_PATH, JSON.stringify(episodes, null, 2)))
    .then(() => undefined);
  return writeLock;
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

  await writeCache(merged);
  return merged;
}
