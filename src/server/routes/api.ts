import { Hono } from "hono";
import { readCache } from "../cache";
import { toggleVote, getVoteCounts } from "../db";

const api = new Hono();

api.get("/episodes", async (c) => {
  const episodes = await readCache();
  const voteCounts = getVoteCounts();

  const withVotes = episodes.map((ep) => ({
    ...ep,
    votes: voteCounts[ep.id] ?? 0,
  }));

  return c.json(withVotes);
});

api.post("/votes/:id", async (c) => {
  const episodeId = c.req.param("id");

  if (!episodeId || episodeId.length > 256) {
    return c.json({ error: "invalid episodeId" }, 400);
  }

  let voterId: string;
  try {
    const body = await c.req.json<{ voterId: string }>();
    voterId = body.voterId;
  } catch {
    return c.json({ error: "missing voterId" }, 400);
  }

  if (!voterId || typeof voterId !== "string" || voterId.length > 64) {
    return c.json({ error: "invalid voterId" }, 400);
  }

  const result = toggleVote(episodeId, voterId);
  return c.json(result);
});

export default api;
