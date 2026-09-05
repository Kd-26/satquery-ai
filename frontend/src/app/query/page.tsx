"use client";
import React, { useState, useEffect } from 'react';
import { UploadPanel } from '../../components/UploadPanel';
import { QueryBox } from '../../components/QueryBox';
import { EvidencePanel } from '../../components/EvidencePanel';
import { TracePanel } from '../../components/TracePanel';
import { ReportExport } from '../../components/ReportExport';
import { MapViewer } from '../../components/MapViewer';
import { useRun } from '../../hooks/useApi';


export default function QueryPage() {
    const [imageIds, setImageIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [runId, setRunId] = useState<string | null>(null);

    // TanStack React Query — replaces manual setInterval polling
    const { data: runResult } = useRun(runId);

    // Stop the loading spinner once the run reaches a terminal state
    useEffect(() => {
        if (!runResult) return;
        const terminal = runResult.status === 'done' || runResult.status === 'error';
        if (terminal) setIsLoading(false);
    }, [runResult]);

    const handleUploadComplete = (ids: string[]) => {
        setImageIds(ids);
    };

    const handleQuerySubmit = async (query: string) => {
        setIsLoading(true);
        setRunId(null);

        try {
            const response = await fetch('/api/v1/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, image_ids: imageIds }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Query failed (${response.status})`);
            }

            const data = await response.json();
            setRunId(data.run_id);
        } catch (e) {
            console.error('[QueryPage] Failed to submit query:', e);
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-primary p-6 md:p-8 font-sans text-text-primary">
            {/* Header Telemetry Banner */}
            <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-accent animate-ping"></span>
                        <span className="font-mono text-xs text-accent uppercase tracking-widest">
                            TACTICAL OPERATIONS // QUICK QUERY DISPATCH
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                        Dual-Register Geospatial Intelligence
                    </h1>
                    <p className="text-text-secondary text-sm">
                        Upload multi-spectral (MSI) or SAR imagery, submit freeform analytical queries, and review neuro-symbolic proofs.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="bg-panel px-3 py-2 border border-subtle rounded text-xs font-mono">
                        <span className="text-text-secondary block">COPERNICUS STAC</span>
                        <span className="text-success font-semibold">ONLINE (S1/S2/L9)</span>
                    </div>
                    <div className="bg-panel px-3 py-2 border border-subtle rounded text-xs font-mono">
                        <span className="text-text-secondary block">DOMAIN SHIFT GUARD</span>
                        <span className="text-accent font-semibold">STRICT ENFORCED</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Upload + Query + Results */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <UploadPanel onUploadComplete={handleUploadComplete} />
                    
                    <QueryBox 
                        imageIds={imageIds} 
                        onSubmit={handleQuerySubmit} 
                        isLoading={isLoading} 
                    />
                    
                    {isLoading && (
                        <div className="p-4 bg-panel border border-accent rounded-DEFAULT text-accent flex items-center gap-3">
                            <svg className="animate-spin h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <div>
                                <p className="font-medium text-sm">Executing Neuro-Symbolic Plan...</p>
                                <p className="text-xs text-text-secondary">Generating DAG, calculating spectral indices, querying PostGIS.</p>
                            </div>
                        </div>
                    )}
                    
                    {runResult && runResult.status === 'done' && (
                        <div className="flex flex-col gap-2">
                            <EvidencePanel runResult={runResult} />
                            <TracePanel traces={runResult.traces} />
                            <ReportExport runId={runId as string} />
                            <a 
                                href={`/explorer/${runId}`} 
                                className="block text-center mt-2 text-accent hover:underline text-sm font-medium py-2.5 bg-panel-raised border border-subtle rounded-DEFAULT transition-colors hover:bg-subtle"
                            >
                                Open in Evidence Explorer Workspace &rarr;
                            </a>
                        </div>
                    )}
                    
                    {runResult && runResult.status === 'error' && (
                        <div className="p-4 bg-panel border border-danger rounded-DEFAULT text-danger">
                            <h3 className="font-semibold mb-1 text-sm">Execution Fault:</h3>
                            <p className="text-xs font-mono">{runResult.error}</p>
                        </div>
                    )}
                </div>
                
                {/* Right Column: Live Map Viewer */}
                <div className="lg:col-span-7 bg-panel border border-subtle rounded-DEFAULT overflow-hidden min-h-[620px] flex flex-col">
                    <MapViewer imageIds={imageIds} runResult={runResult} />
                </div>
            </div>
        </main>
    );
}
