"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import { Panel } from '../../../components/ui/Panel';
import { useExplorerStore } from '../../../state/explorerStore';

export default function EvidenceExplorerPage() {
    const params = useParams();
    const runId = params.runId as string;
    const selectedRegionId = useExplorerStore((state: any) => state.selectedRegionId);
    const setSelectedRegionId = useExplorerStore((state: any) => state.setSelectedRegionId);

    return (
        <main className="min-h-screen p-8 flex flex-col h-screen bg-primary text-text-primary">
            <header className="mb-4 flex justify-between items-center border-b border-subtle pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Evidence Explorer Workspace</h1>
                    <p className="text-sm text-text-secondary">Run ID: <span className="font-mono text-accent">{runId}</span></p>
                </div>
                <a href="/query" className="text-accent hover:underline text-sm font-mono font-medium flex items-center gap-1">
                    &larr; Back to Quick Query
                </a>
            </header>

            <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
                <Panel className="col-span-8 h-full flex items-center justify-center bg-panel-raised">
                    <span className="text-text-secondary text-lg font-mono">Panel A: Geospatial Viewer (Chunk 16)</span>
                </Panel>
                
                <div className="col-span-4 h-full flex flex-col gap-4 overflow-hidden">
                    <Panel className="flex-1 flex flex-col items-center justify-center bg-panel-raised p-4">
                        <span className="text-text-secondary text-lg font-mono mb-2">Panel B: Analysis (Chunk 17.1)</span>
                        <div className="mt-2 text-sm text-text-primary text-center">
                            <p>Selected Region: <span className="font-mono text-accent">{selectedRegionId || 'None'}</span></p>
                            <button 
                                className="text-accent hover:underline mt-2 font-mono text-xs block" 
                                onClick={() => setSelectedRegionId('reg_123')}
                            >
                                [ Test Select Region ]
                            </button>
                        </div>
                    </Panel>
                    
                    <Panel className="flex-1 flex items-center justify-center bg-panel-raised">
                        <span className="text-text-secondary text-lg font-mono">Panel C: History (Chunk 17.2)</span>
                    </Panel>
                </div>
            </div>
        </main>
    );
}
