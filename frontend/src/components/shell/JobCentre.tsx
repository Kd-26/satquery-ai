"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface JobCentreProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_JOBS = [
  { id: 1, title: "Optical-SAR Fusion (Region 4)", status: "running",   progress: 65, time: "2m 14s" },
  { id: 2, title: "Sentinel-2 Ingestion (Coastal)", status: "completed", time: "14s ago" },
  { id: 3, title: "Cloud Mask Generation",           status: "failed",    error: "NoData mask exceeded threshold" },
];

export default function JobCentre({ isOpen, onClose }: JobCentreProps) {
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
              {MOCK_JOBS.map((job) => (
                <div key={job.id} className="bg-surface border border-stroke rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-medium text-text-primary leading-tight pr-4">{job.title}</h4>
                    {job.status === "running" && <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />}
                    {job.status === "completed" && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                    {job.status === "failed" && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                  </div>

                  {job.status === "running" && "progress" in job && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>Processing workflow...</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-stroke/50 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-400 rounded-full" style={{ width: `${job.progress}%` }} />
                      </div>
                    </div>
                  )}

                  {job.status === "failed" && "error" in job && (
                    <p className="text-xs text-red-400/80 bg-red-500/10 p-2 rounded-lg">{job.error}</p>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted uppercase tracking-wider">
                    <span>{job.status}</span>
                    <span>{"time" in job ? job.time : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
