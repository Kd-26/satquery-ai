"use client";

import { Suspense } from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import MapCanvas from "@/components/results/MapCanvas";
import LayerManager from "@/components/results/LayerManager";
import PairComparison from "@/components/results/PairComparison";
import EvidencePanel from "@/components/results/EvidencePanel";
import MeasurementTable from "@/components/results/MeasurementTable";
import ConfidenceBar from "@/components/results/ConfidenceBar";
import { Download, Share2, Printer, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { getRun, getRunGraph, downloadRunExport, type RunResult, type GraphData, type ExportFormat } from "@/lib/api";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
const POLL_INTERVAL = 2500;

// Inner component that uses useSearchParams — must be wrapped in Suspense
function InsightsContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");

  const [activeTab, setActiveTab] = useState("Semantic");
  const [compareMode, setCompareMode] = useState("swipe");
  const [run, setRun] = useState<RunResult | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(!!runId);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getRun(runId);
        if (cancelled) return;
        setRun(result);
        if (result.status === "done") {
          setLoading(false);
          getRunGraph(runId)
            .then((g) => { if (!cancelled) setGraph(g); })
            .catch(() => {});
        } else if (result.status === "failed") {
          setLoading(false);
          setError("Analysis run failed. Please try again.");
        } else {
          setTimeout(poll, POLL_INTERVAL);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to fetch run status");
        setLoading(false);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [runId]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!runId) return;
    setExporting(format);
    try {
      await downloadRunExport(runId, format);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }, [runId]);

  const confidence = run?.claims?.[0]?.confidence
    ? Math.round(run.claims[0].confidence * 100)
    : null;

  return (
    <div className="min-h-screen bg-bg h-screen flex flex-col">
      <div className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-6 md:px-10 lg:px-12 pt-8 pb-8 h-full">

        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 shrink-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              {loading ? (
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              ) : error ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
              <span className="text-xs text-muted uppercase tracking-[0.3em]">
                {loading ? `Running… ${run?.progress ?? 0}%` : error ? "Analysis Failed" : "Analysis Complete"}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl text-text-primary leading-[1.1]">
              Results <span className="font-display italic">workspace</span>
            </h1>
            {runId && (
              <p className="text-xs text-muted font-mono mt-1">run: {runId.slice(0, 8)}…</p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-stroke text-sm font-medium text-muted hover:text-text-primary hover:bg-white/5 transition-colors">
              <Share2 className="w-4 h-4" />Share
            </button>
            <button
              onClick={() => handleExport("audit-report")}
              disabled={!runId || loading || !!exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-stroke text-sm font-medium text-muted hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exporting === "audit-report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Report
            </button>
            <div className="relative group">
              <button
                onClick={() => handleExport("geojson")}
                disabled={!runId || loading || !!exporting}
                className="relative rounded-full text-sm transition-transform duration-200 hover:scale-105 group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="absolute rounded-full accent-gradient opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={{ inset: "-1px" }} />
                <span className="relative z-10 flex items-center gap-2 px-6 py-2 rounded-full bg-bg text-text-primary font-medium">
                  {exporting && exporting !== "audit-report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export Package
                </span>
              </button>
              {runId && !loading && (
                <div className="absolute right-0 top-full mt-2 bg-surface border border-stroke rounded-2xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 min-w-[160px]">
                  {(["geojson", "geotiff", "csv", "stac", "notebook"] as ExportFormat[]).map((fmt) => (
                    <button key={fmt} onClick={() => handleExport(fmt)} className="w-full text-left px-4 py-2.5 text-xs text-muted hover:text-text-primary hover:bg-white/5 transition-colors uppercase tracking-wider">
                      {fmt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {loading && (
          <div className="mb-4 w-full h-1 bg-stroke/30 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 transition-all duration-700" style={{ width: `${run?.progress ?? 10}%` }} />
          </div>
        )}

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          <motion.div
            className="w-full lg:w-[65%] flex flex-col relative min-h-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            <div className="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide shrink-0 pb-1">
              {["Source", "Semantic", "Change", "Quality"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab ? "text-text-primary" : "text-muted hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div layoutId="insight-tab-bubble" className="absolute inset-0 bg-white/10 rounded-full border border-white/20" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                  )}
                  <span className="relative z-10">{tab} Layer</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1 rounded-3xl overflow-hidden border border-stroke min-h-[400px]">
              <MapCanvas activeTab={activeTab} />
              <LayerManager />
              {activeTab === "Change" && <PairComparison activeMode={compareMode} onModeChange={setCompareMode} />}
            </div>
          </motion.div>

          <motion.div
            className="w-full lg:w-[35%] flex flex-col min-h-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
          >
            <ConfidenceBar confidence={confidence} />
            <MeasurementTable run={run} />
            <EvidencePanel run={run} graph={graph} loading={loading} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Page export — wraps InsightsContent in Suspense for Next.js 15 static builds
export default function InsightsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading workspace…</span>
        </div>
      </div>
    }>
      <InsightsContent />
    </Suspense>
  );
}
