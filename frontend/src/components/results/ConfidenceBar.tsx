"use client";

import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

export default function ConfidenceBar() {
  return (
    <div className="bg-surface border border-stroke rounded-3xl p-4 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-medium text-text-primary">High Confidence</h3>
        </div>
        <span className="text-2xl font-display text-text-primary">92%</span>
      </div>
      
      <div className="w-full h-2 bg-bg rounded-full overflow-hidden mb-4">
        <div className="h-full bg-gradient-to-r from-green-500 to-green-400 w-[92%]" />
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg border border-stroke rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider">Input Quality</span>
          <span className="text-sm font-medium text-green-400">96%</span>
        </div>
        <div className="bg-bg border border-stroke rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider">Model Conf</span>
          <span className="text-sm font-medium text-green-400">89%</span>
        </div>
        <div className="bg-bg border border-stroke rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider">Method Match</span>
          <span className="text-sm font-medium text-green-400">92%</span>
        </div>
      </div>
    </div>
  );
}
