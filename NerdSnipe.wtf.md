---
title: NerdSnipe.wtf
status: Doing
tags:
  - typescript
  - bun
  - tailwind
  - self-hosting
  - frontend
  - personal
created: 2026-04-23
icon: LiFolderGit2
---

# NerdSnipe.wtf

## Overview

Fan site for the Nerd Snipe podcast at `nerdsnipe.wtf`. Two hosts deep into AI coding (one loves `Svelte`, one hates it). Site pulls episodes automatically via RSS + `WebSub` for YouTube links. OSS, self-hostable for other podcasts.

## Source Links

- RSS: `https://anchor.fm/s/1112097e0/podcast/rss`
- Spotify: `https://podcasters.spotify.com/pod/show/nerd-sniped`
- Apple Podcasts: `https://podcasts.apple.com/us/podcast/nerd-snipe-with-theo-and-ben/id1892197141`

## Stack

- `Bun` + `Hono` for the server
- `Tailwind` for styling
- `WebSub` subscriber for YouTube push notifications
- Flat JSON cache for episodes, updated on push
- `SQLite` for votes (random `UUID` per visitor stored in `localStorage`, no accounts, no IP)
- `Docker` image built via `GitHub Actions`, pushed to `ghcr.io`
- Deployed via `Dokploy` webhook on image push, DNS via `Cloudflare`

## Design

AI chat interface. Tested brutalist, old school, AI chat, and 4Chan styles. Went with AI chat. TCG card style didn't mesh.

**Intro animation:** fake chat interface on first load, prompt appears asking for episodes, episode list streams in like an LLM response. `localStorage` flag skips it on subsequent visits. "Replay intro" button re-runs it in place without reloading. Respects `prefers-reduced-motion`, manual toggle saved to `localStorage`.

**Episode rows:** YouTube embed (views and ads still count), date, episode number, title, duration, upvote button. Filter bar for search once backlog grows.

**Votes:** upvote per episode. Random `UUID` generated on first visit, stored in `localStorage`, used as vote identity. No IP stored, nothing reversible. Clearing `localStorage` lets you revote, which is fine.

**Easter egg:** something fun with `Svelte` given the hosts' opinions. Maybe a hidden reference or a "made with: [intentionally blank]" footer.

## Episode Data Pipeline

**RSS (primary):** poll `https://anchor.fm/s/1112097e0/podcast/rss` on startup and every 30-60 min via cron. Parse Atom XML, update JSON cache with any new episodes. Source of truth for audio, title, description, duration, publish date.

**Apple Podcasts links:** on startup, fetch `https://itunes.apple.com/lookup?id=1892197141&entity=podcastEpisode&limit=200`. Returns JSON with a `trackId` per episode. Per-episode link is `https://podcasts.apple.com/us/podcast/id1892197141?i=TRACK_ID`. Match to RSS episodes by title or publish date, store alongside episode in JSON cache. No API key, no rate limits.

**YouTube links:** `WebSub` via Google's hub (`pubsubhubbub.appspot.com`). Subscribe on startup, re-subscribe every ~10 days since subscriptions expire. Two webhook routes:
- `GET /webhook` - echo back `hub.challenge` to verify subscription
- `POST /webhook` - parse push, extract YouTube video URL, store alongside episode in JSON cache

## Goals

- [ ] Register `nerdsnipe.wtf`
- [ ] Find YouTube channel ID
- [ ] Set up `WebSub` subscription and webhook routes
- [ ] Startup RSS poll to sync cache on boot
- [ ] Build `Bun` + `Hono` server with JSON cache
- [ ] `SQLite` vote table with hashed IP dedup
- [ ] Build episode list UI with YouTube embeds and upvote buttons
- [ ] Build streaming intro animation with `localStorage` skip flag and replay button
- [ ] `GitHub Actions` CI pipeline, push image to `ghcr.io`
- [ ] Wire `Dokploy` webhook for auto-deploy on image push
- [ ] Deploy, point DNS
