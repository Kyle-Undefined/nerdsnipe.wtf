import { Hono } from "hono";
import { readCache } from "../cache";
import { toggleVote, getVoteCounts, getVotedEpisodes } from "../db";
import { getOrSetVoterId } from "../auth";
import { verifyPow } from "../pow";

const api = new Hono();

// belt-and-suspenders on top of the PoW cost: caps how fast a single voter
// cookie can flip votes, even with precomputed proofs.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(voterId: string): boolean {
  const now = Date.now();
  // prune expired buckets so the map can't grow unbounded
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
  const bucket = rateBuckets.get(voterId);
  if (!bucket) {
    rateBuckets.set(voterId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT_MAX;
}

api.get("/episodes", async (c) => {
  const voterId = await getOrSetVoterId(c);
  const episodes = await readCache();
  const voteCounts = getVoteCounts();
  const votedSet = getVotedEpisodes(voterId);

  const withVotes = episodes.map((ep) => ({
    ...ep,
    votes: voteCounts[ep.id] ?? 0,
    voted: votedSet.has(ep.id),
  }));

  return c.json(withVotes);
});

api.post("/votes/:id", async (c) => {
  const episodeId = c.req.param("id");
  // must match the 128-char ceiling verifyPow enforces
  if (!episodeId || episodeId.length > 128) {
    return c.json({ error: "invalid episodeId" }, 400);
  }

  // only known episodes are votable — otherwise anyone can pay the PoW to
  // stuff junk ids into the votes table
  const episodes = await readCache();
  if (!episodes.some((ep) => ep.id === episodeId)) {
    return c.json({ error: "unknown episode" }, 404);
  }

  let body: { timestamp?: unknown; nonce?: unknown; work?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid body" }, 400);
  }

  const voterId = await getOrSetVoterId(c);
  if (rateLimited(voterId)) {
    return c.json({ error: "too many votes, slow down" }, 429);
  }

  const pow = verifyPow(episodeId, body.timestamp, body.nonce, body.work);
  if (!pow.ok) return c.json({ error: pow.reason ?? "pow failed" }, 403);

  const result = toggleVote(episodeId, voterId);
  return c.json(result);
});

export default api;
