import { useState, useRef, useEffect } from "react";
import { getLocalVote, useVoteToggle } from "../hooks/useVotes";

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
  appleUrl?: string;
  votes: number;
  voted?: boolean;
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

function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [currentTime, setCurrentTime] = useState("0:00:00");
  const [duration, setDuration] = useState("0:00:00");
  const [speed, setSpeed] = useState(1);

  function fmtTime(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    // state is driven by onPlay/onPause events — don't set it here
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * a.duration;
  }

  function skip(secs: number) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, a.currentTime + secs);
  }

  function changeSpeed(val: number) {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = val;
    setSpeed(val);
  }

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

      <div className="flex items-center gap-3">
        <button
          onClick={() => skip(-15)}
          className="w-7 h-7 flex items-center justify-center font-mono text-[10px] text-zinc-400 border border-zinc-800 cursor-pointer bg-transparent hover:border-zinc-600"
          title="back 15s"
        >
          −15
        </button>

        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center text-[15px] font-bold cursor-pointer rounded-full"
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

        {/* progress bar */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-1 bg-zinc-800 relative cursor-pointer" onClick={seek}>
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

        <div className="flex gap-0.5">
          {[1, 1.25, 1.5, 1.75, 2].map((s) => (
            <button
              key={s}
              onClick={() => changeSpeed(s)}
              className="font-mono text-[9px] px-1.5 py-0.5 cursor-pointer border transition-colors"
              style={{
                color: speed === s ? "var(--accent)" : "#71717a",
                border: `1px solid ${speed === s ? "var(--accent)" : "#27272a"}`,
                background:
                  speed === s ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
              }}
            >
              {s}×
            </button>
          ))}
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
  const voteState = getLocalVote(ep.id, ep.votes, ep.voted ?? false);

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
    { label: "spotify", href: "https://creators.spotify.com/pod/profile/nerd-sniped/" },
    ep.appleUrl && { label: "apple", href: ep.appleUrl },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

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
        className="bg-transparent hover:bg-zinc-900/30 transition-colors"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px",
          width: "100%",
          cursor: "pointer",
          boxSizing: "border-box",
          border: "none",
          font: "inherit",
          color: "inherit",
          textAlign: "left",
        }}
      >
        <span
          className="font-mono text-[11px] text-zinc-500 w-3 flex-shrink-0"
          style={{
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform .15s",
            display: "inline-block",
          }}
        >
          ▸
        </span>

        <span className="font-mono text-[11px] text-zinc-400 w-[92px] flex-shrink-0">
          {fmtDate(ep.date)}
        </span>

        <span className="font-mono text-[11px] text-zinc-500 w-10 flex-shrink-0">ep_{ep.num}</span>

        <span className="flex-1 text-sm text-zinc-200 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
          {ep.title}
        </span>

        <span className="font-mono text-[11px] text-zinc-400 w-16 flex-shrink-0 text-right">
          {ep.duration}
        </span>

        {/* vote badge */}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            toggleVote({ episodeId: ep.id, baseline: ep.votes });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              toggleVote({ episodeId: ep.id, baseline: ep.votes });
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
      </button>

      {/* expanded panel */}
      {isOpen && (
        <div className="px-9 pb-5 pt-1 flex gap-4" style={{ background: "#0b0b0d" }}>
          {/* episode art */}
          <div
            className="w-[180px] h-[180px] flex-shrink-0 overflow-hidden border border-zinc-800"
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
                        {line}
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
