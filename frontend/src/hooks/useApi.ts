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
        staleTime: 1000 * 60 * 5, // cache for 5 minutes
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
