"use client";

import { CheckCircle2, FileText, AlertTriangle, Layers, Brain, Loader2 } from "lucide-react";
import type { RunResult, GraphData } from "@/lib/api";

interface EvidencePanelProps {
  run?: RunResult | null;
  graph?: GraphData | null;
  loading?: boolean;
}

export default function EvidencePanel({ run, graph, loading }: EvidencePanelProps) {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto space-y-4 pb-20 scrollbar-hide flex items-start pt-4">
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Waiting for analysis results…</span>
        </div>
      </div>
    );
  }

  const answer = run?.answer_obj?.plain_language ?? run?.answer;
  const limitations = run?.limitations ?? [];
  const traces = run?.traces ?? [];
  const nodes = graph?.nodes ?? [];

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pb-20 scrollbar-hide">

      {/* 1. Direct Answer */}
      {answer && (
        <section className="bg-surface border border-stroke rounded-3xl p-5 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-bl-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 text-sky-400 mb-3">
            <Brain className="w-4 h-4" />
            <h3 className="text-xs uppercase tracking-widest font-medium">Direct Answer</h3>
          </div>
          <p className="text-text-primary text-base leading-relaxed">{answer}</p>
        </section>
      )}

      {/* Technical answer */}
      {run?.answer_obj?.technical && (
        <section className="bg-surface border border-stroke rounded-3xl p-5">
          <div className="flex items-center gap-2 text-muted mb-3">
            <FileText className="w-4 h-4" />
            <h3 className="text-xs uppercase tracking-widest font-medium">Technical Detail</h3>
          </div>
          <p className="text-xs text-muted leading-relaxed font-mono">{run.answer_obj.technical}</p>
        </section>
      )}

      {/* Evidence nodes from graph */}
      {nodes.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4 px-2">
            <Layers className="w-4 h-4 text-muted" />
            <h3 className="text-sm font-medium text-text-primary">Evidence Graph Nodes</h3>
          </div>
          <div className="space-y-2">
            {nodes.map((node) => (
              <div key={node.id} className="bg-surface border border-stroke rounded-2xl p-4 hover:border-sky-500/30 hover:bg-white/5 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-primary font-medium">{node.label}</p>
                  <span className="text-[10px] uppercase tracking-wider text-muted bg-bg border border-stroke px-2 py-1 rounded-md">
                    {node.type}
                  </span>
                </div>
                <p className="text-[10px] text-muted font-mono mt-1">{node.id}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Execution Record */}
      {traces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4 px-2">
            <CheckCircle2 className="w-4 h-4 text-muted" />
            <h3 className="text-sm font-medium text-text-primary">Execution Record</h3>
          </div>
          <div className="bg-surface border border-stroke rounded-2xl p-1 overflow-hidden">
            {traces.map((t, i) => (
              <div
                key={i}
                className={`p-3 hover:bg-white/5 transition-colors flex justify-between items-center cursor-pointer ${
                  i < traces.length - 1 ? "border-b border-stroke" : ""
                }`}
              >
                <span className="text-sm text-muted">{t.model_or_tool}</span>
                <span className="text-xs text-text-primary font-mono bg-bg px-2 py-1 rounded">
                  {t.execution_time_ms}ms
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Limitations */}
      {limitations.length > 0 && (
        <section className="bg-yellow-500/5 border border-yellow-500/20 rounded-3xl p-5 md:p-6">
          <div className="flex items-center gap-2 text-yellow-400 mb-3">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-xs uppercase tracking-widest font-medium">Evidence Limitations</h3>
          </div>
          {limitations.map((lim, i) => (
            <p key={i} className="text-sm text-yellow-400/80 leading-relaxed mb-2">{lim}</p>
          ))}
        </section>
      )}

      {/* Empty state — run done but no answer yet (shouldn't happen with mocks) */}
      {!answer && !loading && run?.status === "done" && (
        <p className="text-sm text-muted text-center pt-4">No answer returned by backend.</p>
      )}

    </div>
  );
}
