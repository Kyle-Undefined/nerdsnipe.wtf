# nerdsnipe.wtf

A fan site for the [Nerd Snipe](http://nerdsnipe.link/pod) podcast. It polls the show's RSS feed, lists every episode, and merges in the matching YouTube video once it goes live. There's an audio player wired straight to the RSS enclosure so plays still count for the show.

I built this because I'm a fan of the podcast, I'm a fan of the term "nerd snipe" in general, and the whole thing was a fun excuse to play with `Claude Design` on a small project (took my entire weekly allotment). Plus, the design leaked a bit into another project, so two for one.

And that's about it, really. Go listen to the [show](https://nerdsnipe.wtf).

## What it does

- Pulls the podcast RSS every hour and caches episodes locally.
- Enriches each episode with an Apple Podcasts deep link (matched by title) so you can hop straight to the iOS app if that's your thing.
- Enriches with the matching YouTube video once it shows up on the channel.
  - Uses the YouTube Data API if `YT_API_KEY` is set, falls back to the channel RSS feed otherwise (last 15 uploads only, but no key required).
- Lets you "vote" on episodes you like. Votes are stored in SQLite, keyed by a server-issued cookie, and gated behind a small client-side `proof-of-work`.
- Renders the whole thing as a single-page React app over a `Hono` server.

## Stack

- `Bun` + `Hono`
- `TanStack Query & Table`
- `bun:sqlite`

## Running it

```bash
bun install
bun run dev
```

For a real build:

```bash
bun run build
bun run start
```

## Environment

- `PORT` (optional): defaults to `42069`.
- `YT_API_KEY` (optional): YouTube Data API v3 key.

## Data

Episodes get cached in `./data/episodes.json`, votes live in `./data/nerdsnipe.db`.
