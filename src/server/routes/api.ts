import { Hono } from "hono";
import { readCache } from "../cache";
import { toggleVote, getVoteCounts, getVotedEpisodes } from "../db";
import { getOrSetVoterId } from "../auth";
import { verifyPow } from "../pow";

const api = new Hono();

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
  if (!episodeId || episodeId.length > 256) {
    return c.json({ error: "invalid episodeId" }, 400);
  }

  let body: { timestamp?: unknown; nonce?: unknown; work?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid body" }, 400);
  }

  const pow = verifyPow(episodeId, body.timestamp, body.nonce, body.work);
  if (!pow.ok) return c.json({ error: pow.reason ?? "pow failed" }, 403);

  const voterId = await getOrSetVoterId(c);
  const result = toggleVote(episodeId, voterId);
  return c.json(result);
});

export default api;
