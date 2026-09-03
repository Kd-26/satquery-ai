"use client";
import React, { useState } from 'react';

export interface TraceStep {
 step_name: string;
 model_or_tool: string;
 params: any;
 duration_ms: number;
}

export interface TracePanelProps {
 traces?: TraceStep[];
}

export const TracePanel: React.FC<TracePanelProps> = ({ traces }) => {
 const [isOpen, setIsOpen] = useState(false);

 const displayTraces = traces && traces.length > 0 ? traces : [
 { step_name:"Planner", model_or_tool:"vlm_service", params: { query:"Find water" }, duration_ms: 1205 },
 { step_name:"Validator", model_or_tool:"validate_plan", params: { plan_id:"plan-123" }, duration_ms: 45 },
 { step_name:"Segmentation", model_or_tool:"SEG_RGB_v1", params: { classes: ["water"] }, duration_ms: 8400 },
 { step_name:"Measurement", model_or_tool:"measure_regions", params: { crs:"EPSG:4326" }, duration_ms: 120 }
 ];

 return (
 <div className="border border-subtle rounded-lg bg-panel mt-4 overflow-hidden">
 <button 
 onClick={() => setIsOpen(!isOpen)}
 className="w-full flex justify-between items-center p-4 bg-primary hover:bg-panel-raised transition-colors text-left focus:outline-none"
 >
 <h3 className="font-semibold text-text-primary text-sm uppercase tracking-wider">Execution Trace (Debug)</h3>
 <span className="text-text-secondary font-mono text-xl leading-none font-bold">
 {isOpen ? '−' : '+'}
 </span>
 </button>
 
 {isOpen && (
 <div className="p-4 border-t border-subtle">
 <div className="space-y-3">
 {displayTraces.map((trace, idx) => (
 <div key={idx} className="bg-panel border border-subtle p-3 rounded-md">
 <div className="flex justify-between items-start mb-2 border-b border-subtle pb-2">
 <span className="font-medium text-text-primary text-sm">
 <span className="text-text-secondary mr-2 font-mono">{idx + 1}.</span> 
 {trace.step_name}
 </span>
 <span className="font-mono text-xs text-text-secondary bg-panel-raised px-2 py-1 rounded border border-subtle">
 {trace.duration_ms}ms
 </span>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-2">
 <div>
 <span className="text-text-secondary block mb-1 uppercase tracking-wider text-[10px]">Component</span>
 <span className="font-mono text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">
 {trace.model_or_tool}
 </span>
 </div>
 <div>
 <span className="text-text-secondary block mb-1 uppercase tracking-wider text-[10px]">Parameters</span>
 <pre className="font-mono text-text-secondary bg-primary p-2 rounded border border-subtle overflow-x-auto text-[10px]">
 {JSON.stringify(trace.params, null, 2)}
 </pre>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
};
