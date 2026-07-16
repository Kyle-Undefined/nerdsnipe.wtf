import { useState, useRef, useEffect } from "react";
import { useVoteToggle } from "../hooks/useVotes";

export interface Episode {
  id: string;
  num: string;
  title: string;
  date: string;
  duration: string;
  description: string;
  audioUrl: string;
  imageUrl?: string;
  ytUrl?: string;
  spotifyUrl?: string;
  appleUrl?: string;
  votes: number;
  voted?: boolean;
}

const URL_RE = /(https?:\/\/[^\s)<>\]]+|(?:^|\s)nerdsnipe\.link\/[^\s)<>\]]+)/g;

function linkify(text: string): React.ReactNode[] {
  const parts = text.split(URL_RE);
  return parts.map((part, i) => {
    if (!part) return null;
    const trimmed = part.trim();
    const isUrl = /^https?:\/\//.test(trimmed) || trimmed.startsWith("nerdsnipe.link/");
    if (!isUrl) return <span key={i}>{part}</span>;
    const leading = part.startsWith(" ") ? " " : "";
    const href = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
    return (
      <span key={i}>
        {leading}
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="no-underline hover:brightness-110"
          style={{ color: "var(--accent)" }}
        >
          {trimmed}
        </a>
      </span>
    );
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AudioPlayerProps {
  audioUrl: string;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00:00");
  const [duration, setDuration] = useState("0:00:00");
  const [speedIdx, setSpeedIdx] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  function fmtTime(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }

  function pctFromPointer(el: HTMLElement, clientX: number): number {
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function seekTo(pct: number) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = pct * a.duration;
  }

  function startScrub(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    seekTo(pctFromPointer(el, e.clientX));
  }

  function moveScrub(e: React.PointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    seekTo(pctFromPointer(e.currentTarget, e.clientX));
  }

  function endScrub(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function startVol(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    changeVolume(pctFromPointer(el, e.clientX));
  }

  function moveVol(e: React.PointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    changeVolume(pctFromPointer(e.currentTarget, e.clientX));
  }

  function skip(secs: number) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, a.currentTime + secs);
  }

  function cycleSpeed(dir: 1 | -1) {
    const next = (speedIdx + dir + SPEEDS.length) % SPEEDS.length;
    const a = audioRef.current;
    if (a) a.playbackRate = SPEEDS[next];
    setSpeedIdx(next);
  }

  function changeVolume(v: number) {
    const clamped = Math.max(0, Math.min(1, v));
    const a = audioRef.current;
    if (a) {
      a.volume = clamped;
      a.muted = false;
    }
    setVolume(clamped);
    setMuted(false);
  }

  function toggleMute() {
    const a = audioRef.current;
    const next = !muted;
    if (a) a.muted = next;
    setMuted(next);
  }

  const displayVolume = muted ? 0 : volume;

  const scrubberTrack = (
    <div className="w-full h-1 bg-zinc-800 relative pointer-events-none">
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: `${progress * 100}%`, background: "var(--accent)" }}
      />
      <div
        className="absolute top-1/2 w-2.5 h-2.5 rounded-full -translate-y-1/2 -translate-x-1/2"
        style={{
          left: `${progress * 100}%`,
          background: "var(--accent)",
          display: progress > 0 ? "block" : "none",
        }}
      />
    </div>
  );

  const speedControl = (
    <div className="flex items-center flex-shrink-0">
      <button
        onClick={() => cycleSpeed(-1)}
        className="font-mono text-[10px] w-8 sm:w-5 h-9 sm:h-6 flex items-center justify-center cursor-pointer text-zinc-500 hover:text-zinc-300 border border-zinc-800 border-r-0 bg-transparent"
        title="slower"
      >
        ‹
      </button>
      <div
        className="font-mono text-[9px] h-9 sm:h-6 px-1.5 flex items-center justify-center border border-zinc-800 tabular-nums"
        style={{
          color: "var(--accent)",
          background: "color-mix(in srgb, var(--accent) 8%, transparent)",
          minWidth: 32,
        }}
      >
        {SPEEDS[speedIdx]}×
      </div>
      <button
        onClick={() => cycleSpeed(1)}
        className="font-mono text-[10px] w-8 sm:w-5 h-9 sm:h-6 flex items-center justify-center cursor-pointer text-zinc-500 hover:text-zinc-300 border border-zinc-800 border-l-0 bg-transparent"
        title="faster"
      >
        ›
      </button>
    </div>
  );

  return (
    <div
      className="mt-3.5 p-3"
      style={{
        border: `1px solid ${playing ? "var(--accent)" : "#27272a"}`,
        background: "#050507",
        transition: "border-color .15s",
      }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setProgress(a.duration ? a.currentTime / a.duration : 0);
          setCurrentTime(fmtTime(a.currentTime));
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(fmtTime(e.currentTarget.duration))}
      />

      {/* Mobile layout: transport row, full-width scrubber, then times flanking speed */}
      <div className="sm:hidden flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => skip(-15)}
            className="w-9 h-9 flex items-center justify-center font-mono text-[10px] text-zinc-400 border border-zinc-800 cursor-pointer bg-transparent hover:border-zinc-600 flex-shrink-0"
            title="back 15s"
          >
            −15
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center text-[15px] font-bold cursor-pointer rounded-full transition-[filter] hover:brightness-110 flex-shrink-0"
            style={{ background: "var(--accent)", color: "#0a0a0b", paddingLeft: playing ? 0 : 2 }}
          >
            {playing ? "❚❚" : "▶"}
          </button>

          <button
            onClick={() => skip(30)}
            className="w-9 h-9 flex items-center justify-center font-mono text-[10px] text-zinc-400 border border-zinc-800 cursor-pointer bg-transparent hover:border-zinc-600 flex-shrink-0"
            title="forward 30s"
          >
            +30
          </button>
        </div>

        {/* Full-width scrubber on mobile */}
        <div
          className="h-6 flex items-center cursor-pointer touch-none select-none"
          onPointerDown={startScrub}
          onPointerMove={moveScrub}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        >
          {scrubberTrack}
        </div>

        {/* Time display flanking speed control — no overflow risk */}
        <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500">
          <span>{currentTime}</span>
          {speedControl}
          <span>{duration}</span>
        </div>
      </div>

      {/* Desktop layout: single row */}
      <div className="hidden sm:flex items-center gap-3">
        <button
          onClick={() => skip(-15)}
          className="w-7 h-7 flex items-center justify-center font-mono text-[10px] text-zinc-400 border border-zinc-800 cursor-pointer bg-transparent hover:border-zinc-600"
          title="back 15s"
        >
          −15
        </button>

        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center text-[15px] font-bold cursor-pointer rounded-full transition-[filter] hover:brightness-110"
          style={{ background: "var(--accent)", color: "#0a0a0b", paddingLeft: playing ? 0 : 2 }}
        >
          {playing ? "❚❚" : "▶"}
        </button>

        <button
          onClick={() => skip(30)}
          className="w-7 h-7 flex items-center justify-center font-mono text-[10px] text-zinc-400 border border-zinc-800 cursor-pointer bg-transparent hover:border-zinc-600"
          title="forward 30s"
        >
          +30
        </button>

        {/* Progress bar */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div
            className="h-1 bg-zinc-800 relative cursor-pointer touch-none select-none"
            onPointerDown={startScrub}
            onPointerMove={moveScrub}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
          >
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{ width: `${progress * 100}%`, background: "var(--accent)" }}
            />
            <div
              className="absolute top-1/2 w-2.5 h-2.5 rounded-full -translate-y-1/2 -translate-x-1/2"
              style={{
                left: `${progress * 100}%`,
                background: "var(--accent)",
                display: progress > 0 ? "block" : "none",
              }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10px] text-zinc-500">
            <span>{currentTime}</span>
            <span>{duration}</span>
          </div>
        </div>

        {speedControl}

        {/* Volume — desktop only */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-5 h-6 flex items-center justify-center cursor-pointer bg-transparent border-none p-0 text-zinc-500 hover:text-zinc-300 transition-colors"
            style={{ color: muted ? "#52525b" : undefined }}
            title={muted ? "unmute" : "mute"}
            aria-label={muted ? "unmute" : "mute"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6v4h2.5L8 13V3L4.5 6H2Z" fill="currentColor" stroke="none" />
              {muted ? (
                <>
                  <line x1="11" y1="6" x2="14" y2="9" />
                  <line x1="14" y1="6" x2="11" y2="9" />
                </>
              ) : (
                <>
                  <path d="M11 5.5a3.5 3.5 0 0 1 0 5" />
                  {volume > 0.6 && <path d="M13 3.5a6 6 0 0 1 0 9" />}
                </>
              )}
            </svg>
          </button>
          <div
            className="w-[60px] h-1 bg-zinc-800 relative cursor-pointer touch-none select-none"
            onPointerDown={startVol}
            onPointerMove={moveVol}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
            title={`volume ${Math.round(displayVolume * 100)}%`}
          >
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{ width: `${displayVolume * 100}%`, background: "var(--accent)" }}
            />
            <div
              className="absolute top-1/2 w-2 h-2 rounded-full -translate-y-1/2 -translate-x-1/2"
              style={{
                left: `${displayVolume * 100}%`,
                background: "var(--accent)",
                display: displayVolume > 0 ? "block" : "none",
              }}
            />
          </div>
        </div>
      </div>

      {playing && (
        <div
          className="mt-2 flex items-center gap-1.5 font-mono text-[9px] tracking-widest uppercase"
          style={{ color: "var(--accent)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent)", animation: "blink 1.2s infinite" }}
          />
          now playing · streaming
        </div>
      )}
    </div>
  );
}

interface EpisodeRowProps {
  episode: Episode;
  streamDelay: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function EpisodeRow({ episode: ep, streamDelay, isOpen, onToggle }: EpisodeRowProps) {
  const [revealed, setRevealed] = useState(streamDelay === 0);
  const { mutate: toggleVote } = useVoteToggle();
  const voteState = { voted: ep.voted ?? false, count: ep.votes };

  useEffect(() => {
    if (streamDelay === 0) {
      setRevealed(true);
      return;
    }
    const t = setTimeout(() => setRevealed(true), streamDelay);
    return () => clearTimeout(t);
  }, [streamDelay]);

  const podLinks = [
    ep.ytUrl && { label: "youtube", href: ep.ytUrl },
    ep.spotifyUrl && { label: "spotify", href: ep.spotifyUrl },
    ep.appleUrl && { label: "apple", href: ep.appleUrl },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const voteBadge = (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        toggleVote({ episodeId: ep.id });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          toggleVote({ episodeId: ep.id });
        }
      }}
      className="font-mono text-[11px] px-2 py-0.5 w-[52px] flex-shrink-0 text-center transition-all cursor-pointer"
      style={{
        color: voteState.voted ? "var(--accent)" : "#71717a",
        border: `1px solid ${voteState.voted ? "var(--accent)" : "#27272a"}`,
        background: voteState.voted
          ? "color-mix(in srgb, var(--accent) 8%, transparent)"
          : "transparent",
      }}
    >
      {voteState.voted ? "wtf!" : "wtf?"} {voteState.count}
    </span>
  );

  return (
    <div
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(4px)",
        transition: "opacity .25s ease, transform .25s ease",
        borderBottom: "1px solid #18181b",
      }}
    >
      {/* collapsed row */}
      <button
        onClick={onToggle}
        className="w-full flex items-start sm:items-center gap-2 sm:gap-3 bg-transparent hover:bg-zinc-900/30 transition-colors cursor-pointer text-left"
        style={{
          padding: "10px",
          boxSizing: "border-box",
          border: "none",
          font: "inherit",
          color: "inherit",
        }}
      >
        {/* chevron */}
        <span
          className="font-mono text-[11px] text-zinc-500 w-3 flex-shrink-0 mt-[3px] sm:mt-0"
          style={{
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform .15s",
            display: "inline-block",
          }}
        >
          ▸
        </span>

        {/* date — desktop only */}
        <span className="hidden sm:inline font-mono text-[11px] text-zinc-400 w-[92px] flex-shrink-0">
          {fmtDate(ep.date)}
        </span>

        {/* ep# — desktop only */}
        <span className="hidden sm:inline font-mono text-[11px] text-zinc-500 w-10 flex-shrink-0">
          ep_{ep.num}
        </span>

        {/* center content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-zinc-200 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
              {ep.title}
            </span>

            {/* duration — desktop only, in title row */}
            <span className="hidden sm:inline font-mono text-[11px] text-zinc-400 w-16 flex-shrink-0 text-right">
              {ep.duration}
            </span>

            {voteBadge}
          </div>

          {/* mobile meta line */}
          <div className="sm:hidden mt-1 font-mono text-[10px] text-zinc-500 leading-none">
            {fmtDate(ep.date)} · ep_{ep.num} · {ep.duration}
          </div>
        </div>
      </button>

      {/* expanded panel */}
      {isOpen && (
        <div
          className="px-4 sm:px-9 pb-5 pt-1 flex flex-col sm:flex-row gap-4"
          style={{ background: "#0b0b0d" }}
        >
          {/* episode art */}
          <div
            className="w-full max-w-[200px] sm:max-w-none sm:w-[180px] sm:h-[180px] mx-auto sm:mx-0 aspect-square sm:aspect-auto flex-shrink-0 overflow-hidden border border-zinc-800"
            style={{ background: "#050507" }}
          >
            {ep.imageUrl ? (
              <img src={ep.imageUrl} alt={ep.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 font-mono text-[9px] text-zinc-600 text-center p-2">
                <div className="text-2xl text-zinc-700">◾</div>
                <div className="text-zinc-700">{ep.num}</div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* meta */}
            <div className="flex items-center gap-4 font-mono text-[11px] text-zinc-500 mb-2.5">
              <span>{fmtDate(ep.date)}</span>
              <span>·</span>
              <span>{ep.duration}</span>
              <span>·</span>
              <span>ep_{ep.num}</span>
            </div>

            <h3 className="text-[17px] font-semibold text-zinc-200 leading-tight tracking-tight mb-2">
              {ep.title}
            </h3>

            <div className="text-sm text-zinc-400 leading-relaxed mb-3.5 flex flex-col gap-2">
              {(
                ep.description ||
                `Ben and Theo get into it on "${ep.title.toLowerCase()}". Description will pull from the RSS feed once wired up.`
              )
                .split("\n\n")
                .map((para, i) => (
                  <p key={i}>
                    {para.split("\n").map((line, j, arr) => (
                      <span key={j}>
                        {linkify(line)}
                        {j < arr.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                ))}
            </div>

            {/* listen links */}
            <div className="flex gap-2 items-center flex-wrap">
              <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mr-1">
                listen on
              </span>
              {podLinks.map((p) => (
                <a
                  key={p.label}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pod-link font-mono text-[11px] px-2.5 py-1 no-underline tracking-wide"
                  style={{
                    color: "var(--accent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                    background: "color-mix(in srgb, var(--accent) 6%, transparent)",
                  }}
                >
                  {p.label} ↗
                </a>
              ))}
            </div>

            {ep.audioUrl && <AudioPlayer audioUrl={ep.audioUrl} />}
          </div>
        </div>
      )}
    </div>
  );
}
