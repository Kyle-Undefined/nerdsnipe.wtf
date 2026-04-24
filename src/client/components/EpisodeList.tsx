import { useState, useMemo } from "react";
import { EpisodeRow, type Episode } from "./EpisodeRow";

const PAGE_SIZE = 25;

type SortKey = "newest" | "starred" | "longest" | "shortest";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "newest",
  starred: "most starred",
  longest: "longest",
  shortest: "shortest",
};

function sortEpisodes(episodes: Episode[], sort: SortKey): Episode[] {
  const copy = [...episodes];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    case "starred":
      return copy.sort((a, b) => b.votes - a.votes);
    case "longest":
      return copy.sort((a, b) => b.duration.localeCompare(a.duration));
    case "shortest":
      return copy.sort((a, b) => a.duration.localeCompare(b.duration));
  }
}

interface EpisodeListProps {
  episodes: Episode[];
  skipIntroDelay: boolean;
  onReplay: () => void;
}

export function EpisodeList({ episodes, skipIntroDelay, onReplay }: EpisodeListProps) {
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(() => sortEpisodes(episodes, sort), [episodes, sort]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter((ep) => ep.title.toLowerCase().includes(q));
  }, [sorted, query]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // page numbers to show — always show first, last, and ±2 around current
  function pageNumbers(): Array<number | "…"> {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: Array<number | "…"> = [];
    for (let n = 1; n <= totalPages; n++) {
      if (n === 1 || n === totalPages || Math.abs(n - safePage) <= 2) {
        out.push(n);
      } else if (out[out.length - 1] !== "…") {
        out.push("…");
      }
    }
    return out;
  }

  return (
    <div>
      {/* sort + filter bar */}
      <div className="flex gap-1.5 items-center flex-wrap mb-3.5">
        <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mr-1">
          sort
        </span>
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              setSort(key);
              setPage(1);
            }}
            className="px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-widest cursor-pointer"
            style={{
              background: sort === key ? "var(--accent)" : "transparent",
              color: sort === key ? "#0a0a0b" : "#a1a1aa",
              border: `1px solid ${sort === key ? "var(--accent)" : "#27272a"}`,
            }}
          >
            {SORT_LABELS[key]}
          </button>
        ))}
        <input
          placeholder="filter by title…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="ml-auto font-mono text-[11px] bg-[#0f0f11] border border-zinc-800 text-zinc-200 px-2.5 py-0.5 outline-none w-44 placeholder-zinc-600"
        />
      </div>

      {/* rows */}
      <div className="border-t border-zinc-900">
        {paged.map((ep, i) => (
          <EpisodeRow
            key={ep.id}
            episode={ep}
            streamDelay={skipIntroDelay ? 0 : 80 * i}
            isOpen={openId === ep.id}
            onToggle={() => setOpenId(openId === ep.id ? null : ep.id)}
          />
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center font-mono text-sm text-zinc-600">
            no episodes match "{query}"
          </div>
        )}
      </div>

      {/* pagination — only show when we actually have multiple pages */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center gap-2 font-mono text-[11px]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-3 py-1 border border-zinc-800 cursor-pointer bg-transparent"
            style={{
              color: safePage === 1 ? "#3f3f46" : "#e4e4e7",
              cursor: safePage === 1 ? "default" : "pointer",
            }}
          >
            ← prev
          </button>

          {pageNumbers().map((n, i) =>
            n === "…" ? (
              <span key={`ellipsis-${i}`} className="text-zinc-600 px-1">
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => setPage(n)}
                className="px-2.5 py-1 border cursor-pointer min-w-[28px]"
                style={{
                  background: n === safePage ? "var(--accent)" : "transparent",
                  color: n === safePage ? "#0a0a0b" : "#a1a1aa",
                  border: `1px solid ${n === safePage ? "var(--accent)" : "#27272a"}`,
                }}
              >
                {n}
              </button>
            ),
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-3 py-1 border border-zinc-800 bg-transparent"
            style={{
              color: safePage === totalPages ? "#3f3f46" : "#e4e4e7",
              cursor: safePage === totalPages ? "default" : "pointer",
            }}
          >
            next →
          </button>

          <span className="ml-auto text-zinc-500">
            showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
        </div>
      )}

      <div className="mt-4 text-xs text-zinc-500 font-mono">
        streamed {paged.length} rows ·{" "}
        <button
          onClick={onReplay}
          className="bg-transparent border-0 cursor-pointer p-0 font-mono text-xs"
          style={{ color: "var(--accent)" }}
        >
          replay intro ↻
        </button>
      </div>
    </div>
  );
}
