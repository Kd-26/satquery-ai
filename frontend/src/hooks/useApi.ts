import { useQuery } from '@tanstack/react-query';

export function useRun(runId: string | null) {
    return useQuery({
        queryKey: ['run', runId],
        queryFn: async () => {
            if (!runId) return null;
            const res = await fetch(`/api/v1/runs/${runId}`);
            if (!res.ok) throw new Error('Failed to fetch run');
            return res.json();
        },
        enabled: !!runId,
        staleTime: 1000 * 60 * 5,
        // Poll every 2s, but stop automatically once the run is in a terminal state
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'done' || status === 'error') return false;
            return 2000;
        },
    });
}

export function useEvidenceGraph(runId: string | null) {
    return useQuery({
        queryKey: ['evidenceGraph', runId],
        queryFn: async () => {
            if (!runId) return null;
            const res = await fetch(`/api/v1/runs/${runId}/graph`);
            if (!res.ok) throw new Error('Failed to fetch evidence graph');
            return res.json();
        },
        enabled: !!runId,
        staleTime: 1000 * 60 * 5,
    });
}
