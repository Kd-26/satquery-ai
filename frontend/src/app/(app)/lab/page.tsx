"use client";

import { motion } from "framer-motion";
import ExperimentBuilder from "@/components/lab/ExperimentBuilder";
import ParameterConsole from "@/components/lab/ParameterConsole";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const RUNS = [
  { id: "run-001", date: "Sep 05, 2026", status: "Completed", water: "14.2 km²", conf: 92, params: "Cloud: 10%, NDWI: 0.3" },
  { id: "run-002", date: "Sep 04, 2026", status: "Completed", water: "16.8 km²", conf: 88, params: "Cloud: 15%, NDWI: 0.25" },
  { id: "run-003", date: "Sep 03, 2026", status: "Failed",    water: "—",       conf: 0,  params: "Cloud: 5%, NDWI: 0.45" },
];

const statusColor: Record<string, string> = {
  Completed: "bg-green-500/20 text-green-400",
  Failed:    "bg-red-500/20 text-red-400",
  Running:   "bg-blue-500/20 text-blue-400",
};

export default function LabPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-12 pt-8 pb-20">

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Research Environment</span>
          </div>
          <h1 className="text-4xl md:text-5xl text-text-primary leading-[1.1]">
            Scientific <span className="font-display italic">lab</span>
          </h1>
        </motion.div>

        {/* Main 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Experiment Builder */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            <ExperimentBuilder />
          </motion.div>

          {/* Centre: Parameter Console + Run History */}
          <motion.div
            className="lg:col-span-5 space-y-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease }}
          >
            {/* Parameter Console */}
            <ParameterConsole />

            {/* Run History */}
            <div className="bg-surface border border-stroke rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-medium text-text-primary">Run History</h3>
                <span className="text-xs text-muted">{RUNS.length} runs</span>
              </div>

              <div className="space-y-3">
                {RUNS.map((run) => (
                  <div key={run.id} className="group flex items-center gap-4 p-3 rounded-2xl bg-bg border border-stroke hover:border-sky-500/30 transition-all cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted">{run.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[run.status]}`}>
                          {run.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted truncate">{run.params}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-display text-text-primary">{run.water}</p>
                      {run.conf > 0 && (
                        <p className="text-[10px] text-green-400">{run.conf}% conf</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Run Comparison */}
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
          >
            <div className="bg-surface border border-stroke rounded-3xl p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-medium text-text-primary">Run Comparison</h3>
                <button className="text-xs text-sky-400 hover:text-sky-300 transition-colors">Select runs</button>
              </div>

              {/* Compare Card */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[RUNS[0], RUNS[1]].map((run) => (
                  <div key={run.id} className="bg-bg border border-stroke rounded-2xl p-4 flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-muted uppercase">{run.id}</span>
                    <p className="text-2xl font-display text-text-primary">{run.water}</p>
                    <p className="text-[10px] text-muted leading-relaxed">{run.params}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {[
                  { label: "Water Area", a: "14.2 km²", b: "16.8 km²", delta: "−15.5%", neg: true },
                  { label: "Confidence", a: "92%",      b: "88%",      delta: "+4%",    neg: false },
                  { label: "Masked Px",  a: "4.2%",     b: "11.7%",    delta: "−7.5%",  neg: false },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 text-xs p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <span className="text-muted w-24 shrink-0">{row.label}</span>
                    <span className="text-text-primary flex-1 text-center">{row.a}</span>
                    <span className="text-text-primary flex-1 text-center">{row.b}</span>
                    <span className={`w-14 text-right font-medium ${row.neg ? "text-red-400" : "text-green-400"}`}>{row.delta}</span>
                  </div>
                ))}
              </div>

              {/* Notebook / Notes */}
              <div className="mt-6 pt-5 border-t border-stroke">
                <h4 className="text-xs text-muted uppercase tracking-wider mb-3">Research Notes</h4>
                <textarea
                  className="w-full bg-bg border border-stroke rounded-2xl p-3 text-sm text-text-primary placeholder:text-muted/50 outline-none resize-none min-h-[80px] text-xs leading-relaxed"
                  placeholder="Record hypothesis, observations, and conclusions for this experiment…"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
