import { Database } from "bun:sqlite";
import { join } from "path";
import { mkdirSync } from "node:fs";

const DATA_DIR = join(import.meta.dir, "../../data");
const DB_PATH = join(DATA_DIR, "nerdsnipe.db");

mkdirSync(DATA_DIR, { recursive: true });

let _db: Database | null = null;

function getDb(): Database {
  if (_db) return _db;
  _db = new Database(DB_PATH, { create: true });
  _db.run("PRAGMA journal_mode = WAL;");

  _db.run("CREATE TABLE IF NOT EXISTS _schema (version INTEGER NOT NULL)");
  const row = _db.prepare("SELECT version FROM _schema LIMIT 1").get() as
    | { version: number }
    | undefined;

  if (!row) {
    _db.run("INSERT INTO _schema (version) VALUES (2)");
  } else if (row.version < 2) {
    // pre-cookie votes were keyed on a client-generated UUID and were ungameable
    // proof of nothing. Wipe before switching to server-issued cookie identity.
    _db.run("DROP TABLE IF EXISTS votes");
    _db.run("UPDATE _schema SET version = 2");
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      episode_id TEXT NOT NULL,
      voter_id TEXT NOT NULL,
      PRIMARY KEY (episode_id, voter_id)
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

  db.run("BEGIN IMMEDIATE");
  try {
    const result = db
      .prepare("INSERT OR IGNORE INTO votes (episode_id, voter_id) VALUES (?, ?)")
      .run(episodeId, voterId);

    if (result.changes === 0) {
      db.prepare("DELETE FROM votes WHERE episode_id = ? AND voter_id = ?").run(episodeId, voterId);
    }

    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM votes WHERE episode_id = ?")
      .get(episodeId) as { count: number };

    db.run("COMMIT");
    return { voted: result.changes > 0, count };
  } catch (err) {
    db.run("ROLLBACK");
    throw err;
  }
}

export function getVoteCounts(): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare("SELECT episode_id, COUNT(*) as count FROM votes GROUP BY episode_id")
    .all() as Array<{ episode_id: string; count: number }>;

  return Object.fromEntries(rows.map((r) => [r.episode_id, r.count]));
}

export function getVotedEpisodes(voterId: string): Set<string> {
  const db = getDb();
  const rows = db.prepare("SELECT episode_id FROM votes WHERE voter_id = ?").all(voterId) as Array<{
    episode_id: string;
  }>;
  return new Set(rows.map((r) => r.episode_id));
}
