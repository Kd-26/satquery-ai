"use client";

/**
 * Global tracked-jobs store (Zustand — matches CLAUDE.md's client-state
 * stack). Backs the Job Centre (components/shell/JobCentre.tsx) with real
 * run data instead of a hardcoded mock list.
 *
 * A job is added the moment a query is submitted (see analyze/QueryComposer)
 * and is kept updated via a Server-Sent Events subscription to
 * /api/v1/runs/{run_id}/events, independent of whichever page is currently
 * mounted — so the Job Centre (opened from the topbar on any page) always
 * reflects live state.
 */
import { create } from "zustand";
import { subscribeRunEvents, cancelRun, type RunStatusValue } from "@/lib/api";

export interface TrackedJob {
  runId: string;
  title: string;
  status: RunStatusValue;
  stage: string;
  progress: number;
  error?: string | null;
  createdAt: number;
}

interface JobsState {
  jobs: Record<string, TrackedJob>;
  /** Registers a new run and opens a live SSE subscription for it. */
  startTracking: (runId: string, title: string) => void;
  /** Requests cancellation of a run via the API; SSE will reflect the result. */
  cancelJob: (runId: string) => Promise<void>;
  removeJob: (runId: string) => void;
}

// EventSource handles live outside the store's serializable state.
const _subscriptions: Record<string, () => void> = {};

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: {},

  startTracking: (runId, title) => {
    if (get().jobs[runId]) return; // already tracking

    set((s) => ({
      jobs: {
        ...s.jobs,
        [runId]: {
          runId,
          title,
          status: "pending",
          stage: "queued",
          progress: 0,
          createdAt: Date.now(),
        },
      },
    }));

    const unsubscribe = subscribeRunEvents(
      runId,
      (payload) => {
        set((s) => {
          const existing = s.jobs[runId];
          if (!existing) return s;
          return {
            jobs: {
              ...s.jobs,
              [runId]: {
                ...existing,
                status: payload.status,
                stage: payload.stage,
                progress: payload.progress,
                error: payload.error,
              },
            },
          };
        });
      },
      () => {
        // Connection dropped (e.g. server restarted mid-run) — stop retrying
        // rather than spinning forever; the Job Centre will show the last
        // known stage.
        _subscriptions[runId]?.();
        delete _subscriptions[runId];
      }
    );
    _subscriptions[runId] = unsubscribe;
  },

  cancelJob: async (runId) => {
    await cancelRun(runId);
    // The SSE stream will push the resulting "cancelled" status shortly;
    // no optimistic local mutation to avoid showing a state the backend
    // hasn't actually confirmed yet.
  },

  removeJob: (runId) => {
    _subscriptions[runId]?.();
    delete _subscriptions[runId];
    set((s) => {
      const rest = { ...s.jobs };
      delete rest[runId];
      return { jobs: rest };
    });
  },
}));
