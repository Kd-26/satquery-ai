"use client";

import type { RunResult } from "@/lib/api";

interface MeasurementTableProps {
  run?: RunResult | null;
}

export default function MeasurementTable({ run }: MeasurementTableProps) {
  const claims = run?.claims ?? [];
  const traces = run?.traces ?? [];

  return (
    <div className="bg-surface border border-stroke rounded-3xl p-5 mb-4 shrink-0">
      <h3 className="text-xs text-muted uppercase tracking-widest mb-4">Measurements</h3>

      {claims.length === 0 ? (
        <p className="text-xs text-muted/60 italic">
          {run ? "No measurements recorded." : "Waiting for results…"}
        </p>
      ) : (
        <div className="space-y-2">
          {claims.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary font-medium truncate capitalize">{c.claim}</p>
                <p className="text-[10px] text-muted font-mono truncate">{c.region_id?.slice(0, 8)}…</p>
              </div>
              <div className="text-right ml-3 shrink-0">
                <p className="text-sm font-display text-text-primary">
                  {typeof c.measurement === "number"
                    ? c.measurement > 1000
                      ? `${(c.measurement / 1000).toFixed(1)}k`
                      : c.tool?.includes("pixel_fraction")
                        ? `${c.measurement.toFixed(1)}%`
                        : `${c.measurement.toFixed(2)} ha`
                    : c.measurement}
                </p>
                <p className="text-[10px] text-green-400">{Math.round((c.confidence ?? 0) * 100)}% conf</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {traces.length > 0 && (
        <>
          <h3 className="text-xs text-muted uppercase tracking-widest mt-5 mb-3">Execution Trace</h3>
          <div className="space-y-1.5">
            {traces.map((t, i) => {
              // Backend sends { step, model_id?, duration_s, status, note? }
              // Frontend previously expected { step_name, execution_time_ms }
              const stepLabel = t.step_name ?? t.step ?? "step";
              const durationMs =
                t.execution_time_ms != null
                  ? t.execution_time_ms
                  : typeof t.duration_s === "number"
                  ? Math.round(t.duration_s * 1000)
                  : null;
              const modelNote = t.model_id ? ` · ${t.model_id}` : t.note ? ` · ${t.note}` : "";
              const statusColor = t.status === "failed" ? "text-red-400" : "text-text-primary";

              return (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <span className="text-muted truncate flex-1">
                    {stepLabel}{modelNote}
                  </span>
                  <span className={`font-mono ml-2 shrink-0 ${statusColor}`}>
                    {durationMs != null ? `${durationMs}ms` : t.status ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
