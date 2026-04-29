import { useMutation, useQueryClient } from "@tanstack/react-query";

const VOTER_KEY = "nerdsnipe:voter";

export function getVoterId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VOTER_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
    localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}

export interface EpisodeWithVotes {
  id: string;
  votes: number;
  [key: string]: unknown;
}

// local vote state lives here so the star updates instantly, even before the server responds
const localVotes = new Map<string, { count: number; voted: boolean }>();

export function getLocalVote(episodeId: string, baseline: number) {
  return localVotes.get(episodeId) ?? { count: baseline, voted: false };
}

export function useVoteToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      episodeId,
      baseline: _baseline,
    }: {
      episodeId: string;
      baseline: number;
    }) => {
      const voterId = getVoterId();

      const res = await fetch(`/api/votes/${episodeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId }),
      });

      if (!res.ok) throw new Error("vote failed");
      return (await res.json()) as { voted: boolean; count: number };
    },

    onMutate: ({ episodeId, baseline }) => {
      // optimistic update — flip immediately, revert if the server errors
      const current = getLocalVote(episodeId, baseline);
      const next = {
        voted: !current.voted,
        count: current.count + (current.voted ? -1 : 1),
      };
      localVotes.set(episodeId, next);
      queryClient.invalidateQueries({ queryKey: ["episodes"] });
      return { previous: current };
    },

    onSuccess: (data, { episodeId }) => {
      localVotes.set(episodeId, data);
      queryClient.invalidateQueries({ queryKey: ["episodes"] });
    },

    onError: (_err, { episodeId }, context) => {
      if (context?.previous) {
        localVotes.set(episodeId, context.previous);
      }
    },
  });
}
