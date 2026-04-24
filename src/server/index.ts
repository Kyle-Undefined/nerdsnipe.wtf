import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import api from "./routes/api";
import webhook from "./routes/webhook";
import { syncRss } from "./rss";
import { subscribe } from "./websub";

const app = new Hono();

// static assets (built client bundle, images)
app.use("/public/*", serveStatic({ root: "./" }));

// API
app.route("/api", api);

// WebSub webhook
app.route("/webhook", webhook);

// everything else gets the SPA shell
app.get("*", serveStatic({ path: "./index.html" }));

const port = Number(process.env.PORT ?? 3000);

// kick off background tasks — don't await, server starts immediately
(async () => {
  await syncRss();
  await subscribe();

  // re-sync RSS every 30 min
  setInterval(syncRss, 30 * 60 * 1000);
  // re-subscribe to WebSub every 9 days (subscriptions expire at 10)
  setInterval(subscribe, 9 * 24 * 60 * 60 * 1000);
})();

export default {
  port,
  fetch: app.fetch,
};

console.log(`[server] running on http://localhost:${port}`);
