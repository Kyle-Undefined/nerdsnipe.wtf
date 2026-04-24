import { Hono } from "hono";
import { handlePush } from "../websub";

const webhook = new Hono();

// WebSub verification — hub sends a GET with hub.challenge, we echo it back
webhook.get("/", (c) => {
  const challenge = c.req.query("hub.challenge");
  if (!challenge) return c.text("missing challenge", 400);
  return c.text(challenge);
});

// YouTube push notification
webhook.post("/", async (c) => {
  const body = await c.req.text();
  // fire and forget — hub doesn't care about our processing time
  handlePush(body).catch((err) => console.error("[webhook] push error:", err));
  return c.text("ok");
});

export default webhook;
