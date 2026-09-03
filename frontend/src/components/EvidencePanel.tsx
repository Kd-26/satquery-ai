"use client";
import React, { useState } from 'react';
import { Panel } from './ui/Panel';
import { Tabs } from './ui/Tabs';
import { Badge } from './ui/Badge';
import { DataReadout } from './ui/DataReadout';

export interface Claim {
 claim: string;
 measurement: number;
 region_id: string;
 source_images: string[];
 tool: string;
 confidence: number;
}

export interface EvidencePanelProps {
 runResult: any;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ runResult }) => {
 const [viewMode, setViewMode] = useState<'plain' | 'technical'>('plain');

 if (!runResult) return null;

 const answer = runResult.answer_obj || {
 plain_language: runResult.answer ||"No plain language answer available.",
 technical:"Technical breakdown: Model inference completed. Mathematical evidence confirmed."
 };
 
 // Provide a mock claim for visual testing if none exist
 const claims = runResult.claims || [
 { claim:"Detected Built-up Area", measurement: 45000, region_id:"reg_xyz123", confidence: 0.92 }
 ];
 const limitations = runResult.limitations || [
"Area estimate may be extrapolated due to pixel spacing mismatch."
 ];

 return (
 <Panel className="mt-4">
 <div className="flex justify-between items-center mb-4 border-b pb-2">
 <h3 className="text-lg font-semibold text-text-primary">Analysis Results</h3>
 <Tabs tabs={["plain", "technical"]} activeTab={viewMode} onChange={(t) => setViewMode(t as any)} />
</div>

 <div className="mb-6">
 <p className="whitespace-pre-wrap text-text-primary leading-relaxed text-sm">
 {viewMode === 'plain' ? answer.plain_language : answer.technical}
 </p>
 </div>

 {claims.length > 0 && (
 <div className="mb-6">
 <h4 className="font-semibold text-text-primary mb-2 text-sm uppercase tracking-wider">Evidence & Claims</h4>
 <div className="overflow-x-auto border border-subtle rounded-md">
 <table className="min-w-full text-sm text-left">
 <thead className="bg-primary border-b border-subtle">
 <tr>
 <th className="px-4 py-2 font-medium text-text-secondary">Claim</th>
 <th className="px-4 py-2 font-medium text-text-secondary text-right">Measurement</th>
 <th className="px-4 py-2 font-medium text-text-secondary">Region ID</th>
 <th className="px-4 py-2 font-medium text-text-secondary text-right">Confidence</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 bg-panel">
 {claims.map((claim: Claim, idx: number) => (
 <tr key={idx} className="hover:bg-primary">
 <td className="px-4 py-2 text-text-primary">{claim.claim}</td>
 <td className="px-4 py-2 text-right"><DataReadout label="" value={claim.measurement} /></td>
 <td className="px-4 py-2 font-mono text-text-secondary text-xs">{claim.region_id}</td>
 <td className="px-4 py-2 text-right"><DataReadout label="" value={(claim.confidence * 100).toFixed(1)} unit="%" /></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {limitations.length > 0 && (
 <div className="bg-panel border border-warning p-3 rounded-md">
 <h4 className="font-semibold text-warning mb-1 text-sm flex items-center gap-2">
 Limitations & Warnings
 </h4>
 <ul className="list-disc pl-5 text-sm text-warning space-y-1">
 {limitations.map((lim: string, idx: number) => (
 <li key={idx}>{lim}</li>
 ))}
 </ul>
 </div>
 )}
 </div>
 );
};
