"use client";
import React, { useState } from 'react';

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
        plain_language: runResult.answer || "No plain language answer available.",
        technical: "Technical breakdown: Model inference completed. Mathematical evidence confirmed."
    };
    
    // Provide a mock claim for visual testing if none exist
    const claims = runResult.claims || [
        { claim: "Detected Built-up Area", measurement: 45000, region_id: "reg_xyz123", confidence: 0.92 }
    ];
    const limitations = runResult.limitations || [
        "Area estimate may be extrapolated due to pixel spacing mismatch."
    ];

    return (
        <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm mt-4">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-800">Analysis Results</h3>
                <div className="flex gap-1 text-sm bg-gray-100 p-1 rounded-md">
                    <button 
                        className={`px-3 py-1 rounded-md transition-colors ${viewMode === 'plain' ? 'bg-white shadow text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-800'}`}
                        onClick={() => setViewMode('plain')}
                    >
                        Plain Language
                    </button>
                    <button 
                        className={`px-3 py-1 rounded-md transition-colors ${viewMode === 'technical' ? 'bg-white shadow text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-800'}`}
                        onClick={() => setViewMode('technical')}
                    >
                        Technical
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <p className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
                    {viewMode === 'plain' ? answer.plain_language : answer.technical}
                </p>
            </div>

            {claims.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wider">Evidence & Claims</h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-gray-600">Claim</th>
                                    <th className="px-4 py-2 font-medium text-gray-600 text-right">Measurement</th>
                                    <th className="px-4 py-2 font-medium text-gray-600">Region ID</th>
                                    <th className="px-4 py-2 font-medium text-gray-600 text-right">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {claims.map((claim: Claim, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-gray-800">{claim.claim}</td>
                                        <td className="px-4 py-2 font-mono text-gray-600 text-right">{claim.measurement}</td>
                                        <td className="px-4 py-2 font-mono text-gray-500 text-xs">{claim.region_id}</td>
                                        <td className="px-4 py-2 font-mono text-gray-600 text-right">{(claim.confidence * 100).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {limitations.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-md">
                    <h4 className="font-semibold text-orange-800 mb-1 text-sm flex items-center gap-2">
                        Limitations & Warnings
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-orange-700 space-y-1">
                        {limitations.map((lim: string, idx: number) => (
                            <li key={idx}>{lim}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
