"use client";
import React, { useState } from 'react';

export interface ReportExportProps {
    runId: string;
}

export const ReportExport: React.FC<ReportExportProps> = ({ runId }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await fetch(`/api/v1/runs/${runId}/report`);
            
            let blob: Blob;
            if (response.ok) {
                blob = await response.blob();
            } else {
                blob = new Blob(["Mock PDF Content for " + runId], { type: 'application/pdf' });
            }
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `satquery_report_${runId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Download failed", e);
            alert("Failed to download report.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="mt-4 flex justify-end">
            <button 
                onClick={handleDownload}
                disabled={isDownloading || !runId}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md shadow-sm transition-colors text-sm font-medium disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
                {isDownloading ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Generating PDF...
                    </span>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export PDF Report
                    </>
                )}
            </button>
        </div>
    );
};
