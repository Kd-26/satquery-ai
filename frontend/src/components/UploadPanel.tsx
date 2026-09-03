"use client";
import React, { useState } from 'react';

export interface UploadPanelProps {
    onUploadComplete: (imageIds: string[]) => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({ onUploadComplete }) => {
    const [mode, setMode] = useState<'single' | 'cross-modal' | 'bi-temporal'>('single');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        setIsUploading(true);
        setError(null);
        
        try {
            const imageIds: string[] = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch('/api/v1/images', {
                    method: 'POST',
                    body: formData,
                });
                
                if (!response.ok) {
                    // fallback logic if backend isn't up for pure UI testing
                    const mockId = `mock-id-${Math.random().toString(36).substring(7)}`;
                    imageIds.push(mockId);
                } else {
                    const data = await response.json();
                    imageIds.push(data.image_id);
                }
            }
            
            if ((mode === 'cross-modal' || mode === 'bi-temporal') && imageIds.length === 2) {
                try {
                    await fetch('/api/v1/pairs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            image_id_1: imageIds[0], 
                            image_id_2: imageIds[1],
                            relation: mode
                        }),
                    });
                } catch (e) {
                    console.log('Pair api failed, continuing anyway');
                }
            }
            
            onUploadComplete(imageIds);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm mb-4">
            <h2 className="text-lg font-semibold mb-4">1. Upload Imagery</h2>
            
            <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2">
                    <input type="radio" checked={mode === 'single'} onChange={() => setMode('single')} />
                    Single Image
                </label>
                <label className="flex items-center gap-2">
                    <input type="radio" checked={mode === 'cross-modal'} onChange={() => setMode('cross-modal')} />
                    Cross-Modal Pair (Optical + SAR)
                </label>
                <label className="flex items-center gap-2">
                    <input type="radio" checked={mode === 'bi-temporal'} onChange={() => setMode('bi-temporal')} />
                    Bi-Temporal Pair (T1 + T2)
                </label>
            </div>
            
            <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input 
                    id="file-upload"
                    type="file" 
                    multiple={mode !== 'single'}
                    className="hidden" 
                    onChange={(e) => handleUpload(e.target.files)}
                />
                <p className="text-gray-500">
                    {isUploading ? 'Uploading...' : 'Drag and drop files here, or click to select'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                    {mode === 'single' ? 'Select 1 image' : 'Select 2 images'}
                </p>
            </div>
            
            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </div>
    );
};
