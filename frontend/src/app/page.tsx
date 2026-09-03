"use client";
import React, { useState, useEffect } from 'react';
import { UploadPanel } from '../components/UploadPanel';
import { QueryBox } from '../components/QueryBox';
import { MapViewer } from '../components/MapViewer';

export default function HomePage() {
    const [imageIds, setImageIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [runId, setRunId] = useState<string | null>(null);
    const [runResult, setRunResult] = useState<any>(null);

    const handleUploadComplete = (ids: string[]) => {
        setImageIds(ids);
    };

    const handleQuerySubmit = async (query: string) => {
        setIsLoading(true);
        setRunResult(null);
        setRunId(null);
        
        try {
            const response = await fetch('/api/v1/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    image_ids: imageIds
                })
            });
            
            if (!response.ok) {
                console.log('Mocking run submission...');
                setRunId('mock-run-123');
                return;
            }
            
            const data = await response.json();
            setRunId(data.run_id);
        } catch (e) {
            console.error("Failed to submit query", e);
            setRunId('mock-run-123');
        }
    };

    useEffect(() => {
        if (!runId) return;

        let interval: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/v1/runs/${runId}`);
                if (!res.ok) {
                    setRunResult({ status: 'done', answer: "This is a mocked answer for the GUI testing." });
                    setIsLoading(false);
                    clearInterval(interval);
                    return;
                }
                const data = await res.json();
                
                if (data.status === 'done') {
                    setRunResult(data);
                    setIsLoading(false);
                    clearInterval(interval);
                } else if (data.status === 'error') {
                    setRunResult({ status: 'error', error: data.error || 'Unknown error' });
                    setIsLoading(false);
                    clearInterval(interval);
                }
            } catch (e) {
                setRunResult({ status: 'done', answer: "This is a mocked answer for the GUI testing." });
                setIsLoading(false);
                clearInterval(interval);
            }
        };

        interval = setInterval(checkStatus, 2000);
        return () => clearInterval(interval);
    }, [runId]);

    return (
        <main className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                
                <div className="col-span-1 flex flex-col gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">SatQuery AI</h1>
                    <p className="text-gray-600 mb-4">Neuro-symbolic satellite imagery analysis.</p>
                    
                    <UploadPanel onUploadComplete={handleUploadComplete} />
                    
                    <QueryBox 
                        imageIds={imageIds} 
                        onSubmit={handleQuerySubmit} 
                        isLoading={isLoading} 
                    />
                    
                    {isLoading && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 animate-pulse">
                            Processing query... this may take a moment depending on the model pipeline.
                        </div>
                    )}
                    
                    {runResult && runResult.status === 'done' && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-900">
                            <h3 className="font-semibold mb-2">Answer:</h3>
                            <p className="whitespace-pre-wrap">{runResult.answer || "Analysis complete."}</p>
                        </div>
                    )}
                    
                    {runResult && runResult.status === 'error' && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
                            <h3 className="font-semibold mb-2">Error:</h3>
                            <p>{runResult.error}</p>
                        </div>
                    )}
                </div>
                
                <div className="col-span-1 md:col-span-2 bg-white border rounded-lg shadow-sm overflow-hidden min-h-[600px] flex items-center justify-center">
                    {imageIds.length > 0 ? (
                        <div className="text-center text-gray-400">
                            <p className="text-lg">Map Viewer Area</p>
                            <p className="text-sm">(To be implemented in Chunk 10.2)</p>
                            <p className="text-xs mt-2">Loaded Images: {imageIds.join(', ')}</p>
                        </div>
                    ) : (
                        <p className="text-gray-400">Upload an image to see the map view</p>
                    )}
                </div>
                
            </div>
        </main>
    );
}
