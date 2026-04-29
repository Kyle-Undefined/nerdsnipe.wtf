import { Hono } from "hono";
import { handlePush, WEBSUB_SECRET } from "../websub";

async function verifySignature(body: string, sigHeader: string | undefined): Promise<boolean> {
  if (!WEBSUB_SECRET) return true;
  if (!sigHeader?.startsWith("sha256=")) return false;
  const expected = sigHeader.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBSUB_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === expected;
}

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

  if (!(await verifySignature(body, c.req.header("X-Hub-Signature-256")))) {
    return c.text("invalid signature", 403);
  }

  // fire and forget — hub doesn't care about our processing time
  handlePush(body).catch((err) => console.error("[webhook] push error:", err));
  return c.text("ok");
});

export default webhook;
