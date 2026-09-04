import React from 'react';
import { Panel } from '../../components/ui/Panel';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function HistoryPage() {
    const mockHistory = [
        { id: 'run-8f72c1', date: '2026-09-04 14:22', query: 'Detect urban expansion in region NW-4', status: 'completed', regions: 2 },
        { id: 'run-3a19b8', date: '2026-09-04 10:15', query: 'Calculate NDVI anomaly across Sentinel-2 stack', status: 'completed', regions: 5 },
        { id: 'run-9c44e2', date: '2026-09-03 16:45', query: 'Cross-modal SAR/Optical flood detection', status: 'error', regions: 1 },
        { id: 'run-5d88f1', date: '2026-09-02 09:30', query: 'Identify illegal logging roads in Amazon basin', status: 'completed', regions: 14 },
    ];

    return (
        <main className="min-h-screen bg-primary p-6 md:p-8 text-text-primary font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 border-b border-subtle pb-4">
                    <h1 className="text-3xl font-bold tracking-tight">Execution History</h1>
                    <p className="text-text-secondary mt-1">Review past neuro-symbolic queries and access their evidence graphs.</p>
                </header>

                <Panel className="overflow-hidden p-0 border border-subtle">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-panel-raised border-b border-subtle">
                            <tr>
                                <th className="p-4 font-semibold text-sm">Run ID</th>
                                <th className="p-4 font-semibold text-sm">Date</th>
                                <th className="p-4 font-semibold text-sm">Query</th>
                                <th className="p-4 font-semibold text-sm">Status</th>
                                <th className="p-4 font-semibold text-sm">Regions</th>
                                <th className="p-4 font-semibold text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-subtle">
                            {mockHistory.map((run) => (
                                <tr key={run.id} className="hover:bg-subtle transition-colors">
                                    <td className="p-4 font-mono text-sm text-accent">{run.id}</td>
                                    <td className="p-4 text-sm text-text-secondary">{run.date}</td>
                                    <td className="p-4 text-sm">{run.query}</td>
                                    <td className="p-4">
                                        <Badge variant={run.status === 'completed' ? 'success' : 'danger'}>
                                            {run.status.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-sm text-text-secondary">{run.regions}</td>
                                    <td className="p-4 text-right">
                                        <a href={`/explorer/${run.id}`}>
                                            <Button variant="secondary" className="px-3 py-1 text-xs" disabled={run.status !== 'completed'}>
                                                Explore
                                            </Button>
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Placeholder for pagination */}
                    <div className="p-4 border-t border-subtle flex justify-between items-center text-sm text-text-secondary bg-panel-raised">
                        <span>Showing 1 to 4 of 4 entries</span>
                        <div className="flex gap-2">
                            <Button variant="secondary" className="px-3 py-1 text-xs" disabled>Previous</Button>
                            <Button variant="secondary" className="px-3 py-1 text-xs" disabled>Next</Button>
                        </div>
                    </div>
                </Panel>
            </div>
        </main>
    );
}
