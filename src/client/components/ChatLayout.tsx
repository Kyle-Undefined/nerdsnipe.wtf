import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { HostCard, HOSTS, THEO_MOVES, BEN_MOVES } from "./HostCard";
import { EpisodeList } from "./EpisodeList";
import { useIntro } from "../hooks/useIntro";
import type { Episode } from "./EpisodeRow";

const RECENT_QUERIES = [
  "show me all episodes",
  "what's theo's rant this week?",
  "what's ben working on?",
  "why doesn't theo use obsidian?",
  "most wtf'd episodes",
];

const PLATFORM_LINKS = [
  { label: "rss ↗", href: "https://anchor.fm/s/1112097e0/podcast/rss" },
  { label: "spotify ↗", href: "https://creators.spotify.com/pod/profile/nerd-sniped/" },
  {
    label: "apple ↗",
    href: "https://podcasts.apple.com/us/podcast/nerd-snipe-with-theo-and-ben/id1892197141",
  },
  { label: "youtube ↗", href: "https://www.youtube.com/channel/UC2mPtIOYm1XihpmfrJKXjMw" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { typing, prompted, assistantStarted, replay } = useIntro();

  useEffect(() => {
    document.body.classList.toggle("drawer-open", sidebarOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [sidebarOpen]);

  const {
    data: episodes = [],
    isLoading,
    isError,
  } = useQuery<Episode[]>({
    queryKey: ["episodes"],
    queryFn: async () => {
      const r = await fetch("/api/episodes", { credentials: "same-origin" });
      if (!r.ok) throw new Error(`episodes fetch failed: ${r.status}`);
      return r.json() as Promise<Episode[]>;
    },
    staleTime: 60_000,
  });

  const skipDelay = !typing && prompted && assistantStarted;

  const sidebarCore = (
    <>
      {/* logo */}
      <div className="flex items-center gap-2.5 px-2 pb-4">
        <div
          className="w-8 h-7 flex items-center justify-center font-mono font-bold text-[10px]"
          style={{ background: "var(--accent)", color: "#0a0a0b" }}
        >
          NS
        </div>
        <span className="font-mono text-sm tracking-tight text-zinc-200">nerdsnipe.wtf</span>
      </div>

      {/* new chat = replay intro */}
      <button
        onClick={() => {
          replay();
          setSidebarOpen(false);
        }}
        className="text-left bg-zinc-900 border border-zinc-800 text-zinc-200 px-2.5 py-2 font-mono text-xs cursor-pointer mb-2.5 hover:bg-zinc-800 transition-colors"
      >
        + new chat
      </button>

      <div className="font-mono text-[10px] text-zinc-600 px-2 pt-2.5 pb-1 uppercase tracking-widest">
        recent
      </div>

      {RECENT_QUERIES.map((q, i) => (
        <div
          key={q}
          className="px-2.5 py-1.5 text-xs font-sans whitespace-nowrap overflow-hidden text-ellipsis transition-colors"
          style={{
            color: i === 0 ? "#e4e4e7" : "#a1a1aa",
            background: i === 0 ? "#18181b" : "transparent",
          }}
        >
          {q}
        </div>
      ))}
    </>
  );

  return (
    <div
      className="w-full max-w-[1280px] mx-auto min-h-screen flex"
      style={{ background: "#09090b", color: "#e4e4e7" }}
    >
      {/* Mobile drawer backdrop */}
      <div
        className="fixed inset-0 z-40 sm:hidden"
        style={{
          background: "rgba(0,0,0,0.6)",
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile drawer panel */}
      <div
        className="fixed left-0 top-0 h-dvh w-64 z-50 flex flex-col gap-1 sm:hidden overflow-y-auto"
        aria-hidden={!sidebarOpen}
        style={{
          background: "#0a0a0b",
          padding: "20px 14px",
          borderRight: "1px solid #27272a",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.2s ease",
          pointerEvents: sidebarOpen ? "auto" : "none",
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center font-mono text-sm text-zinc-500 hover:text-zinc-300 bg-transparent border-none cursor-pointer transition-colors"
          aria-label="Close menu"
        >
          ✕
        </button>

        {sidebarCore}

        {/* Platform links — mobile drawer only */}
        <div className="border-t border-zinc-900 mt-3 pt-3 flex flex-col gap-0.5">
          <div className="font-mono text-[10px] text-zinc-600 px-2 pb-1 uppercase tracking-widest">
            listen on
          </div>
          {PLATFORM_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 font-mono text-xs text-zinc-400 no-underline hover:text-zinc-200 transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* model badge */}
        <div className="mt-auto flex gap-2 px-1 py-2 font-mono text-[10px] text-zinc-600">
          <span>model: wtf-l337</span>
          <span className="ml-auto">v4.20.69</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden sm:flex w-60 border-r border-zinc-900 flex-col gap-1 flex-shrink-0 sticky top-0 h-screen overflow-y-auto"
        style={{ background: "#0a0a0b", padding: "20px 14px" }}
      >
        {sidebarCore}

        {/* model badge */}
        <div className="mt-auto flex gap-2 px-1 py-2 font-mono text-[10px] text-zinc-600">
          <span>model: wtf-l337</span>
          <span className="ml-auto">v4.20.69</span>
        </div>
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* header */}
        <header className="flex items-center px-4 sm:px-6 py-3.5 border-b border-zinc-900">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="sm:hidden flex flex-col gap-[5px] p-1 -ml-1 mr-3 cursor-pointer bg-transparent border-none flex-shrink-0"
            aria-label="Open menu"
          >
            <span className="w-[18px] h-[1.5px] bg-zinc-400 block" />
            <span className="w-[18px] h-[1.5px] bg-zinc-400 block" />
            <span className="w-[18px] h-[1.5px] bg-zinc-400 block" />
          </button>

          {/* Mobile: logo in header */}
          <div className="sm:hidden flex items-center gap-2">
            <div
              className="w-7 h-6 flex items-center justify-center font-mono font-bold text-[10px]"
              style={{ background: "var(--accent)", color: "#0a0a0b" }}
            >
              NS
            </div>
            <span className="font-mono text-sm tracking-tight text-zinc-200">nerdsnipe.wtf</span>
          </div>

          {/* Desktop: chat title */}
          <span className="hidden sm:inline font-mono text-xs text-zinc-400">
            chat · all episodes
          </span>

          {/* Platform links — desktop header only */}
          <div className="ml-auto hidden sm:flex gap-2">
            {PLATFORM_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-zinc-400 px-2 py-1 border border-zinc-800 no-underline hover:border-zinc-600 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </header>

        {/* chat thread */}
        <div className="px-4 sm:px-8 pb-10 max-w-[980px] w-full mx-auto flex-1 box-border">
          {/* welcome card */}
          <div
            className="mt-8 border border-zinc-800 p-5"
            style={{
              background: "linear-gradient(180deg, rgba(200,122,90,0.08), transparent 60%)",
            }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-widest mb-2.5"
              style={{ color: "var(--accent)" }}
            >
              conversation started · {episodes.at(-1)?.date ? fmtDate(episodes.at(-1)!.date) : "…"}
            </div>
            <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight leading-tight mb-2.5">
              Real talk from (mostly) real devs.
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-[620px] mb-4">
              Hot takes, honest opinions, and the occasional conspiracy theory.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <HostCard host={HOSTS.theo} moves={THEO_MOVES} />
              <HostCard host={HOSTS.ben} moves={BEN_MOVES} />
            </div>
          </div>

          {/* user prompt bubble */}
          <div className="flex justify-end py-3.5">
            <div className="max-w-[72%] flex flex-col items-end">
              <span className="font-mono text-[11px] text-zinc-500 mb-1.5">you</span>
              <div
                className="border border-zinc-800 px-3.5 py-2.5 text-zinc-200 text-sm leading-relaxed"
                style={{
                  background: "#1f1f22",
                  borderRadius: "14px",
                  borderTopRightRadius: 4,
                }}
              >
                show me all episodes
              </div>
            </div>
          </div>

          {/* assistant response */}
          {prompted && (
            <div className="flex gap-3.5 py-4">
              {/* NS badge */}
              <div
                className="w-8 h-7 flex-shrink-0 flex items-center justify-center font-mono text-[10px] font-bold"
                style={{ background: "var(--accent)", color: "#0a0a0b" }}
              >
                NS
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-mono text-[11px] text-zinc-500 mb-2">nerdsnipe.wtf</div>

                {!assistantStarted ? (
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-1" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-2" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-3" />
                  </div>
                ) : isLoading ? (
                  <p className="text-sm text-zinc-400">Fetching episodes…</p>
                ) : isError ? (
                  <p className="text-sm text-red-400">Failed to load episodes. Try refreshing.</p>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed text-zinc-300 mb-3.5">
                      Here are all <strong>{episodes.length}</strong> episodes, newest first. Click
                      a row to expand, or hit{" "}
                      <strong style={{ color: "var(--accent)" }}>wtf?</strong> if it sniped you.
                    </p>
                    <EpisodeList episodes={episodes} skipIntroDelay={skipDelay} onReplay={replay} />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* footer bar */}
        <div
          className="px-8 pb-6 pt-4 text-center"
          style={{ background: "linear-gradient(180deg, transparent, #09090b 40%)" }}
        >
          <p className="font-mono text-[10px] text-zinc-700">
            nerdsnipe.wtf may hallucinate takes. verify with source material. fan site, not
            affiliated.
          </p>
          <p className="font-mono text-[10px] text-zinc-700 mt-1">
            vibed by:{" "}
            <a
              href="https://kyleundefined.dev"
              target="_blank"
              rel="noopener"
              className="no-underline border-b border-dotted border-zinc-800"
              style={{ color: "#52525b" }}
            >
              kyleundefined.dev
            </a>
            {" | "}
            source:{" "}
            <a
              href="https://github.com/Kyle-Undefined/nerdsnipe.wtf"
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline border-b border-dotted border-zinc-800"
              style={{ color: "#52525b" }}
            >
              github
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
