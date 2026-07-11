import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { secureHeaders } from "hono/secure-headers";
import api from "./routes/api";
import { syncRss } from "./rss";

const app = new Hono();

app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
    },
    strictTransportSecurity: "max-age=31536000; includeSubDomains",
  }),
);

app.onError((err, c) => {
  console.error("[server] unhandled error:", err);
  return c.json({ error: "server error" }, 500);
});

// static assets (built client bundle, images)
app.use("/public/*", serveStatic({ root: "./" }));

// API
app.route("/api", api);

// SPA shell — but never swallow /api/* misses, so unmatched API routes 404
const spaShell = serveStatic({ path: "./index.html" });
app.get("*", async (c, next) => {
  if (c.req.path.startsWith("/api")) return c.notFound();
  return spaShell(c, next);
});

const port = Number(process.env.PORT ?? 42069);

// kick off background tasks — don't await, server starts immediately.
// register the interval before the initial run so a startup failure doesn't
// prevent future syncs from happening.
setInterval(
  () => {
    syncRss().catch((err) => console.error("[sync] interval run failed:", err));
  },
  60 * 60 * 1000,
);

syncRss().catch((err) => console.error("[startup] initial sync failed:", err));

export default {
  port,
  fetch: app.fetch,
};
