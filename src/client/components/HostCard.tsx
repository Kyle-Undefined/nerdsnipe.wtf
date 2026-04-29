interface Move {
  cost: number;
  name: string;
  dmg: number;
}

interface Host {
  name: string;
  handle: string;
  site: string;
  bio: string;
  avatar: string;
  typeColor: string;
}

interface HostCardProps {
  host: Host;
  moves: Move[];
}

function Pips({ filled, color }: { filled: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={
            i < filled
              ? { background: color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.5)" }
              : { border: "1px solid #3f3f46" }
          }
        />
      ))}
    </div>
  );
}

export function HostCard({ host, moves }: HostCardProps) {
  return (
    <div className="flex gap-3.5 items-start">
      {/* avatar — square, no radius, matches the sharp-corner theme */}
      <div className="w-[72px] h-[72px] flex-shrink-0 overflow-hidden bg-black">
        <img src={host.avatar} alt={host.name} className="w-full h-full object-cover object-top" />
      </div>

      <div className="flex-1 min-w-0">
        {/* name + handle + HP */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-bold text-[17px] tracking-tight text-zinc-200">{host.name}</span>
          <span className="font-mono text-[11px] text-zinc-500">{host.handle}</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="font-mono text-[9px] text-zinc-500 tracking-widest">HP</span>
            <span className="font-mono text-sm font-bold text-accent">120</span>
          </div>
        </div>

        {/* site link */}
        <div className="font-mono text-[10px] text-zinc-400 mb-2 tracking-wide">
          <a
            href={`https://${host.site}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent no-underline hover:underline"
          >
            {host.site}
          </a>
        </div>

        {/* bio */}
        <p className="text-xs text-zinc-400 leading-relaxed mb-2.5">{host.bio}</p>

        {/* moves */}
        <div className="border-t border-zinc-800 pt-2 flex flex-col gap-1.5">
          {moves.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <Pips filled={m.cost} color={host.typeColor} />
              <span className="flex-1 text-xs text-zinc-200 font-medium">{m.name}</span>
              <span className="font-mono text-xs font-bold text-accent">{m.dmg || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const HOSTS = {
  theo: {
    name: "Theo",
    handle: "@t3dotgg",
    site: "t3.gg",
    bio: "Software dev, AI nerd, TypeScript sympathizer. Creator of T3 Chat and the T3 Stack.",
    avatar: "/public/assets/theo.webp",
    typeColor: "#a78bd8",
  },
  ben: {
    name: "Ben",
    handle: "@davis7",
    site: "davis7.sh",
    bio: "I do dev stuff and talk about whatever I'm currently nerd sniped by.",
    avatar: "/public/assets/ben.webp",
    typeColor: "#d4916a",
  },
} satisfies Record<string, Host>;

export const THEO_MOVES: Move[] = [
  { cost: 1, name: "Svelte Slander", dmg: 30 },
  { cost: 2, name: "Hot Take", dmg: 80 },
  { cost: 3, name: "Framework Rant", dmg: 120 },
];

export const BEN_MOVES: Move[] = [
  { cost: 1, name: "Actually,", dmg: 40 },
  { cost: 2, name: "Hand Mic", dmg: 70 },
  { cost: 3, name: "Deep Dive", dmg: 120 },
];
