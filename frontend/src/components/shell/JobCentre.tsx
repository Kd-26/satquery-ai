"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, CheckCircle2, AlertTriangle, Loader2, Ban, XCircle } from "lucide-react";
import { useJobsStore } from "@/lib/jobsStore";

interface JobCentreProps {
  isOpen: boolean;
  onClose: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued",
  ingesting: "Ingesting",
  planning: "Planning (VLM)",
  validating: "Validating",
  building_evidence: "Building Evidence",
  vlm_synthesis: "VLM Synthesis",
  verifying: "Verifying Answer",
  complete: "Complete",
  cancelled: "Cancelled",
};

function stageLabel(stage: string): string {
  if (stage.startsWith("executing_tool:")) {
    return `Executing Tool: ${stage.split(":")[1]}`;
  }
  return STAGE_LABELS[stage] ?? stage;
}

export default function JobCentre({ isOpen, onClose }: JobCentreProps) {
  const jobs = useJobsStore((s) => s.jobs);
  const cancelJob = useJobsStore((s) => s.cancelJob);
  const jobList = Object.values(jobs).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-screen w-full max-w-sm bg-bg border-l border-stroke z-50 flex flex-col shadow-2xl"
          >
            <div className="h-16 border-b border-stroke flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span className="font-medium text-text-primary">Job Centre</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-muted hover:text-text-primary rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {jobList.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted gap-2 py-20">
                  <Activity className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No jobs yet — submit a query to see it here.</p>
                </div>
              )}

              {jobList.map((job) => {
                const isActive = job.status === "pending" || job.status === "running";
                return (
                  <div key={job.runId} className="bg-surface border border-stroke rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-medium text-text-primary leading-tight pr-4 truncate">
                        {job.title}
                      </h4>
                      {job.status === "running" && <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />}
                      {job.status === "pending" && <Loader2 className="w-4 h-4 text-muted animate-spin shrink-0" />}
                      {job.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                      {job.status === "failed" && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                      {job.status === "cancelled" && <Ban className="w-4 h-4 text-muted shrink-0" />}
                    </div>

                    {isActive && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span>{stageLabel(job.stage)}</span>
                          <span>{job.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-stroke/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400 rounded-full transition-all duration-500"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {job.status === "failed" && job.error && (
                      <p className="text-xs text-red-400/80 bg-red-500/10 p-2 rounded-lg">{job.error}</p>
                    )}

                    {job.status === "cancelled" && (
                      <p className="text-xs text-muted bg-white/5 p-2 rounded-lg">Cancelled by user.</p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted uppercase tracking-wider">
                      <span>{job.status}</span>
                      {isActive ? (
                        <button
                          onClick={() => cancelJob(job.runId)}
                          className="flex items-center gap-1 text-red-400/80 hover:text-red-400 normal-case tracking-normal transition-colors"
                        >
                          <XCircle className="w-3 h-3" /> Cancel
                        </button>
                      ) : (
                        <span className="font-mono">{job.runId.slice(0, 8)}…</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
