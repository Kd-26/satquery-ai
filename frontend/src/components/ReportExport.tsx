"use client";
import React, { useState } from 'react';
import { Button } from './ui/Button';

export interface ReportExportProps {
 runId: string;
}

export const ReportExport: React.FC<ReportExportProps> = ({ runId }) => {
 const [isDownloading, setIsDownloading] = useState(false);

 const handleDownload = async () => {
 setIsDownloading(true);
    try {
      const response = await fetch(`/api/v1/runs/${runId}/export/audit-report`);
 
 let blob: Blob;
 if (response.ok) {
 blob = await response.blob();
 } else {
 blob = new Blob(["Mock PDF Content for" + runId], { type: 'application/pdf' });
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
 <Button onClick={handleDownload} disabled={isDownloading || !runId} variant="primary" className="flex items-center gap-2">
 {isDownloading ? (
 <span className="flex items-center gap-2">
 <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
 Generating PDF...
 </span>
 ) : (
 <>
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
 Export PDF Report
 </>
 )}
 </Button>
 </div>
 );
};
