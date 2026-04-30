import { useMutation, useQueryClient } from "@tanstack/react-query";
import { computePow } from "../lib/pow";
import type { Episode } from "../components/EpisodeRow";

const EPISODES_KEY = ["episodes"] as const;

interface VoteResponse {
  voted: boolean;
  count: number;
}

function patchEpisode(
  episodes: Episode[] | undefined,
  episodeId: string,
  patch: { voted: boolean; count: number },
): Episode[] | undefined {
  if (!episodes) return episodes;
  return episodes.map((ep) =>
    ep.id === episodeId ? { ...ep, voted: patch.voted, votes: patch.count } : ep,
  );
}

export function useVoteToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ episodeId }: { episodeId: string }) => {
      const proof = await computePow(episodeId);

      const res = await fetch(`/api/votes/${episodeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(proof),
      });

      if (!res.ok) throw new Error("vote failed");
      return (await res.json()) as VoteResponse;
    },

    onMutate: async ({ episodeId }) => {
      await queryClient.cancelQueries({ queryKey: EPISODES_KEY });
      const previous = queryClient.getQueryData<Episode[]>(EPISODES_KEY);
      const target = previous?.find((e) => e.id === episodeId);
      if (target) {
        const wasVoted = target.voted ?? false;
        queryClient.setQueryData<Episode[]>(EPISODES_KEY, (old) =>
          patchEpisode(old, episodeId, {
            voted: !wasVoted,
            count: target.votes + (wasVoted ? -1 : 1),
          }),
        );
      }
      return { previous };
    },

    onSuccess: (data, { episodeId }) => {
      queryClient.setQueryData<Episode[]>(EPISODES_KEY, (old) =>
        patchEpisode(old, episodeId, data),
      );
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(EPISODES_KEY, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: EPISODES_KEY });
    },
  });
}
