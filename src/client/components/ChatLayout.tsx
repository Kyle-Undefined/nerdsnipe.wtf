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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChatLayout() {
  const { typing, prompted, assistantStarted, replay } = useIntro();

  const { data: episodes = [], isLoading } = useQuery<Episode[]>({
    queryKey: ["episodes"],
    queryFn: async () => {
      const r = await fetch("/api/episodes");
      if (!r.ok) throw new Error(`episodes fetch failed: ${r.status}`);
      return r.json() as Promise<Episode[]>;
    },
    staleTime: 60_000,
  });

  const skipDelay = !typing && prompted && assistantStarted;

  return (
    <div
      className="w-full max-w-[1280px] mx-auto min-h-screen flex"
      style={{ background: "#09090b", color: "#e4e4e7" }}
    >
      {/* sidebar */}
      <aside
        className="w-60 border-r border-zinc-900 flex flex-col gap-1 flex-shrink-0"
        style={{ background: "#0a0a0b", padding: "20px 14px" }}
      >
        {/* logo */}
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <div
            className="w-[28px] h-[22px] flex items-center justify-center font-mono font-bold text-[10px]"
            style={{ background: "var(--accent)", color: "#0a0a0b" }}
          >
            NS
          </div>
          <span className="font-mono text-sm tracking-tight text-zinc-200">nerdsnipe.wtf</span>
        </div>

        {/* new chat = replay intro */}
        <button
          onClick={replay}
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
            className="px-2.5 py-1.5 text-xs font-sans whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer transition-colors"
            style={{
              color: i === 0 ? "#e4e4e7" : "#a1a1aa",
              background: i === 0 ? "#18181b" : "transparent",
            }}
          >
            {q}
          </div>
        ))}

        {/* model badge */}
        <div className="mt-auto flex gap-2 px-1 py-2 font-mono text-[10px] text-zinc-600">
          <span>model: wtf-420.69</span>
          <span className="ml-auto">v0.1</span>
        </div>
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* header */}
        <header className="flex items-center px-6 py-3.5 border-b border-zinc-900">
          <span className="font-mono text-xs text-zinc-400">chat · all episodes</span>
          <div className="ml-auto flex gap-2">
            <a
              href="https://anchor.fm/s/1112097e0/podcast/rss"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-zinc-400 px-2 py-1 border border-zinc-800 no-underline hover:border-zinc-600 transition-colors"
            >
              rss ↗
            </a>
            <a
              href="https://open.spotify.com/show/nerd-sniped"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-zinc-400 px-2 py-1 border border-zinc-800 no-underline hover:border-zinc-600 transition-colors"
            >
              spotify ↗
            </a>
            <a
              href="https://podcasts.apple.com/us/podcast/nerd-snipe-with-theo-and-ben/id1892197141"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-zinc-400 px-2 py-1 border border-zinc-800 no-underline hover:border-zinc-600 transition-colors"
            >
              apple ↗
            </a>
            <a
              href="https://www.youtube.com/channel/UC2mPtIOYm1XihpmfrJKXjMw"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-zinc-400 px-2 py-1 border border-zinc-800 no-underline hover:border-zinc-600 transition-colors"
            >
              youtube ↗
            </a>
          </div>
        </header>

        {/* chat thread */}
        <div className="px-8 pb-10 max-w-[980px] w-full mx-auto flex-1 box-border">
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
            <h1 className="text-[32px] font-semibold tracking-tight leading-tight mb-2.5">
              Real talk from (mostly) real devs.
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-[620px] mb-4">
              Hot takes, honest opinions, and the occasional conspiracy theory.
            </p>

            <div className="grid grid-cols-2 gap-3.5">
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
              {/* N badge */}
              <div
                className="w-8 h-7 flex-shrink-0 flex items-center justify-center font-mono text-[10px] font-bold"
                style={{ background: "var(--accent)", color: "#0a0a0b" }}
              >
                NS
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-mono text-[11px] text-zinc-500 mb-2">nerdsnipe.wtf</div>

                {!assistantStarted ? (
                  /* thinking dots */
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-1" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-2" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-dot-3" />
                  </div>
                ) : (
                  <>
                    {isLoading ? (
                      <p className="text-sm text-zinc-400">Fetching episodes…</p>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed text-zinc-300 mb-3.5">
                          Here are all <strong>{episodes.length}</strong> episodes, newest first.
                          Click a row to expand, or{" "}
                          <strong style={{ color: "var(--accent)" }}>wtf?</strong> to upvote.
                        </p>
                        <EpisodeList
                          episodes={episodes}
                          skipIntroDelay={skipDelay}
                          onReplay={replay}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* sticky footer bar */}
        <div
          className="sticky bottom-0 px-8 pb-6 pt-4 text-center"
          style={{ background: "linear-gradient(180deg, transparent, #09090b 40%)" }}
        >
          <p className="font-mono text-[10px] text-zinc-700">
            nerdsnipe.wtf may hallucinate takes. verify with source material.
          </p>
          <p className="font-mono text-[10px] text-zinc-700 mt-1">
            vibed by:{" "}
            <a
              href="https://kyleundefined.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline border-b border-dotted border-zinc-800"
              style={{ color: "#52525b" }}
            >
              kyleundefined.dev
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
