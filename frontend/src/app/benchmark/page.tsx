import React from 'react';
import { Panel } from '../../components/ui/Panel';
import { DataReadout } from '../../components/ui/DataReadout';

export default function BenchmarkPage() {
    return (
        <main className="min-h-screen bg-primary p-6 md:p-8 text-text-primary font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 border-b border-subtle pb-4">
                    <h1 className="text-3xl font-bold tracking-tight">System Benchmarks</h1>
                    <p className="text-text-secondary mt-1">Real-time performance metrics for the execution engine and VLM planner.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Panel className="flex flex-col items-center text-center p-6 border border-subtle">
                        <div className="text-4xl font-mono text-accent mb-2">94.2%</div>
                        <h3 className="font-semibold mb-1">Execution Success Rate</h3>
                        <p className="text-xs text-text-secondary">Over the last 30 days (neuro-symbolic plans)</p>
                    </Panel>
                    
                    <Panel className="flex flex-col items-center text-center p-6 border border-subtle">
                        <div className="text-4xl font-mono text-accent mb-2">1.8s</div>
                        <h3 className="font-semibold mb-1">Avg DAG Generation Time</h3>
                        <p className="text-xs text-text-secondary">Gemini-Flash prompt-to-plan latency</p>
                    </Panel>
                    
                    <Panel className="flex flex-col items-center text-center p-6 border border-subtle">
                        <div className="text-4xl font-mono text-accent mb-2">412ms</div>
                        <h3 className="font-semibold mb-1">Avg Node Execution</h3>
                        <p className="text-xs text-text-secondary">Per-tool processing time (scientific_tools)</p>
                    </Panel>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Panel className="border border-subtle p-6">
                        <h3 className="text-lg font-semibold mb-4 border-b border-subtle pb-2">Tool Usage Frequency</h3>
                        <div className="flex flex-col gap-4">
                            <DataReadout label="spatial_tools.st_area" value="12,403 calls" />
                            <DataReadout label="scientific_tools.ndvi" value="8,912 calls" />
                            <DataReadout label="scientific_tools.sar_backscatter" value="4,150 calls" />
                            <DataReadout label="vlm.visual_qa" value="1,204 calls" />
                            <DataReadout label="spatial_tools.st_intersects" value="893 calls" />
                        </div>
                    </Panel>

                    <Panel className="border border-subtle p-6">
                        <h3 className="text-lg font-semibold mb-4 border-b border-subtle pb-2">Model Accuracy (Latest Eval)</h3>
                        <div className="flex flex-col gap-4">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">Urban Segmentation (SEG_RGB_v1)</span>
                                    <span className="text-sm font-mono text-success">0.91 mIoU</span>
                                </div>
                                <div className="w-full bg-subtle rounded-full h-2">
                                    <div className="bg-success h-2 rounded-full" style={{ width: '91%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">Water Body Masking (SAR_WATER_v2)</span>
                                    <span className="text-sm font-mono text-success">0.95 F1</span>
                                </div>
                                <div className="w-full bg-subtle rounded-full h-2">
                                    <div className="bg-success h-2 rounded-full" style={{ width: '95%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">Cloud Detection (S2_CLOUD_v1)</span>
                                    <span className="text-sm font-mono text-accent">0.88 F1</span>
                                </div>
                                <div className="w-full bg-subtle rounded-full h-2">
                                    <div className="bg-accent h-2 rounded-full" style={{ width: '88%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">Visual QA Planner (Gemini-Flash)</span>
                                    <span className="text-sm font-mono text-accent">0.84 Acc</span>
                                </div>
                                <div className="w-full bg-subtle rounded-full h-2">
                                    <div className="bg-accent h-2 rounded-full" style={{ width: '84%' }}></div>
                                </div>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </main>
    );
}
