import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "../../data/nerdsnipe.db");

let _db: Database | null = null;

function getDb(): Database {
  if (_db) return _db;
  _db = new Database(DB_PATH, { create: true });
  _db.run("PRAGMA journal_mode = WAL;");
  _db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      episode_id TEXT NOT NULL,
      voter_uuid TEXT NOT NULL,
      PRIMARY KEY (episode_id, voter_uuid)
    )
  `);
  return _db;
}

export interface VoteResult {
  voted: boolean;
  count: number;
}

export function toggleVote(episodeId: string, voterId: string): VoteResult {
  const db = getDb();

  const insert = db.prepare("INSERT OR IGNORE INTO votes (episode_id, voter_uuid) VALUES (?, ?)");
  const result = insert.run(episodeId, voterId);

  // row already existed — remove it (toggle off)
  if (result.changes === 0) {
    db.prepare("DELETE FROM votes WHERE episode_id = ? AND voter_uuid = ?").run(episodeId, voterId);
  }

  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM votes WHERE episode_id = ?")
    .get(episodeId) as { count: number };

  return { voted: result.changes > 0, count };
}

export function getVoteCounts(): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare("SELECT episode_id, COUNT(*) as count FROM votes GROUP BY episode_id")
    .all() as Array<{ episode_id: string; count: number }>;

  return Object.fromEntries(rows.map((r) => [r.episode_id, r.count]));
}

export function getVoteStatus(
  episodeId: string,
  voterId: string,
): { voted: boolean; count: number } {
  const db = getDb();

  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM votes WHERE episode_id = ?")
    .get(episodeId) as { count: number };

  const row = db
    .prepare("SELECT 1 FROM votes WHERE episode_id = ? AND voter_uuid = ? LIMIT 1")
    .get(episodeId, voterId);

  return { voted: row != null, count };
}
