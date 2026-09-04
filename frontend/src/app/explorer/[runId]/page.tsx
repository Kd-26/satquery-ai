"use client";
import React from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { ExportMenu } from "../../../components/explorer/ExportMenu";
import { AnalysisPanel } from "../../../components/explorer/AnalysisPanel";
import { EvidenceTagControl } from "../../../components/explorer/EvidenceTagControl";
import { useExplorerStore, ExplorerState } from "../../../state/explorerStore";

// Heavy map + experiment components are client-only and code-split per architecture.md §17.4
const GeospatialViewer = dynamic(
  () =>
    import("../../../components/explorer/GeospatialViewer").then(
      (m) => m.GeospatialViewer
    ),
  { ssr: false }
);
const ExperimentPanel = dynamic(
  () => import("../../../components/explorer/ExperimentPanel"),
  { ssr: false }
);
const ProcessingHistoryPanel = dynamic(
  () =>
    import("../../../components/explorer/ProcessingHistoryPanel").then(
      (m) => m.ProcessingHistoryPanel
    ),
  { ssr: false }
);

export default function EvidenceExplorerPage() {
  const params = useParams();
  const runId = params.runId as string;

  // Typed selectors — no more `any` casts
  const selectedRegionId = useExplorerStore(
    (state: ExplorerState) => state.selectedRegionId
  );

  // Placeholder props for GeospatialViewer — will be populated from run data
  // once the /api/v1/runs/{runId}/graph endpoint is implemented.
  const mockMasks = [
    { id: "water", url: `/api/v1/tiles/{z}/{x}/{y}?run=${runId}&layer=water`, color: "#3b82f6", label: "Water Body" },
    { id: "cloud", url: `/api/v1/tiles/{z}/{x}/{y}?run=${runId}&layer=cloud`, color: "#94a3b8", label: "Cloud Mask" },
  ];

  return (
    <main className="min-h-screen flex flex-col h-screen bg-primary text-text-primary overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex justify-between items-center border-b border-subtle px-6 py-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-mono">
            Evidence Explorer Workspace
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Run ID:{" "}
            <span className="font-mono text-accent">{runId}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportMenu runId={runId} />
          <a
            href="/query"
            className="text-accent hover:underline text-sm font-mono font-medium flex items-center gap-1"
          >
            ← Back to Quick Query
          </a>
        </div>
      </header>

      {/* ── Main grid ────────────────────────────────────────────────── */}
      {/*
        Layout (12-col):
          Col 1–8  → Panel A: Geospatial map viewer (GeospatialViewer)
          Col 9–12 → Panel B: Analysis metrics  (top)
                     Panel C: Processing history (bottom)
        The right sidebar is further split into rows, with ExperimentPanel
        pushed into a collapsible drawer at the bottom.
      */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">

        {/* Panel A — Geospatial Viewer */}
        <div className="col-span-8 h-full overflow-hidden rounded border border-subtle">
          <GeospatialViewer
            runId={runId}
            baseImageUrl={`/api/v1/tiles/{z}/{x}/{y}?run=${runId}`}
            masks={mockMasks}
          />
        </div>

        {/* Right sidebar */}
        <div className="col-span-4 h-full flex flex-col gap-3 overflow-hidden">

          {/* Panel B — Scientific Analysis for the selected region */}
          <div className="flex-1 min-h-0 overflow-auto">
            <AnalysisPanel selectedRegionId={selectedRegionId} />
            {selectedRegionId && (
              <div className="px-4 pb-2">
                <EvidenceTagControl nodeId={selectedRegionId} />
              </div>
            )}
          </div>

          {/* Panel C — Processing History (virtualized node chain) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ProcessingHistoryPanel runId={runId} />
          </div>

          {/* Panel D — What-If Engine */}
          <div className="flex-shrink-0">
            <ExperimentPanel runId={runId} />
          </div>
        </div>
      </div>
    </main>
  );
}
