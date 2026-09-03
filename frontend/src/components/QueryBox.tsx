"use client";
import React, { useState } from 'react';

const REPRESENTATIVE_QUERIES = [
    "Find all water bodies in this image.",
    "Has the built-up area increased, decreased, or remained unchanged?",
    "Detect military vehicles and estimate their coordinates.",
    "Calculate the total area of vegetation in hectares.",
    "Find areas of deforestation between these two dates."
];

export interface QueryBoxProps {
    imageIds: string[];
    onSubmit: (query: string) => void;
    isLoading: boolean;
}

export const QueryBox: React.FC<QueryBoxProps> = ({ imageIds, onSubmit, isLoading }) => {
    const [query, setQuery] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim() && imageIds.length > 0) {
            onSubmit(query);
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm mb-4">
            <h2 className="text-lg font-semibold mb-4">2. Enter Query</h2>
            
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quick Templates
                    </label>
                    <select 
                        className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                        onChange={(e) => {
                            if (e.target.value) setQuery(e.target.value);
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>Select a template...</option>
                        {REPRESENTATIVE_QUERIES.map((q, i) => (
                            <option key={i} value={q}>{q}</option>
                        ))}
                    </select>
                </div>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Query
                    </label>
                    <textarea 
                        className="w-full border-gray-300 rounded-md shadow-sm p-2 border min-h-[100px]"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="E.g., Has the built-up area increased?"
                        required
                    />
                </div>
                
                <button 
                    type="submit" 
                    disabled={isLoading || !query.trim() || imageIds.length === 0}
                    className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? 'Running Analysis...' : 'Run Query'}
                </button>
                
                {imageIds.length === 0 && (
                    <p className="text-xs text-orange-500 mt-2">
                        * Please upload at least one image first.
                    </p>
                )}
            </form>
        </div>
    );
};
