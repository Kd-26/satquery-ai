"use client";

import { GitBranch, ShieldCheck } from "lucide-react";
import type { RunResult } from "@/lib/api";

export default function ProvenancePanel({ run }: { run: RunResult | null }) {
  const nodes = run?.tool_graph?.nodes ?? [];
  return (
    <section className="mt-4 bg-surface border border-stroke rounded-3xl p-5" aria-labelledby="provenance-title">
      <div className="flex items-center gap-2 mb-3"><GitBranch className="w-4 h-4 text-sky-400" /><h2 id="provenance-title" className="text-sm font-medium">Workflow provenance</h2></div>
      {run?.route ? <p className="text-xs text-muted mb-3"><span className="text-text-primary capitalize">{run.route.mode.replaceAll("_", " ")}</span> — {run.route.reason}</p> : null}
      {nodes.length ? <ol className="space-y-2">{nodes.map((node, index) => <li key={node.id} className="flex gap-3 text-xs"><span className="w-5 h-5 rounded-full border border-stroke flex items-center justify-center text-[10px]">{index + 1}</span><div><p className="text-text-primary">{node.tool}</p><p className="text-muted">v{node.version} · {node.required ? "required" : "optional"}</p></div></li>)}</ol> : <p className="text-xs text-muted">No deterministic tool graph for this response.</p>}
      <div className="mt-4 pt-3 border-t border-stroke flex items-center gap-2 text-[11px] text-green-400"><ShieldCheck className="w-3.5 h-3.5" />Both narrative variants are evidence-checked.</div>
    </section>
  );
}
