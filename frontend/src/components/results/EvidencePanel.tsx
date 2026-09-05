"use client";

import { CheckCircle2, ChevronRight, FileText, BarChart3, AlertTriangle, Layers, Brain } from "lucide-react";

export default function EvidencePanel() {
  return (
    <div className="flex-1 overflow-y-auto space-y-6 pb-20 scrollbar-hide">
      
      {/* 1. Direct Answer */}
      <section className="bg-surface border border-stroke rounded-3xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-bl-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-2 text-sky-400 mb-3">
          <Brain className="w-4 h-4" />
          <h3 className="text-xs uppercase tracking-widest font-medium">Direct Answer</h3>
        </div>
        
        <p className="text-text-primary text-base leading-relaxed">
          The total area of surface water detected in the specified region is <strong className="text-sky-400">14.2 sq km</strong>. This represents a <strong className="text-red-400">2.1% decrease</strong> from the historical average for this month.
        </p>
      </section>

      {/* 2. Key Findings */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-2">
          <FileText className="w-4 h-4 text-muted" />
          <h3 className="text-sm font-medium text-text-primary">Key Findings Evidence</h3>
        </div>
        
        <div className="space-y-3">
          {[
            { id: 1, text: "Largest contiguous water body is located in the north-east quadrant.", proof: "Polygon 42", confidence: "High" },
            { id: 2, text: "Suspended sediment levels appear elevated near the river mouth.", proof: "NDWI + Visual", confidence: "Moderate" },
            { id: 3, text: "Urban expansion encroachment detected on the southern bank.", proof: "Change Map", confidence: "High" }
          ].map(finding => (
            <div key={finding.id} className="bg-surface border border-stroke rounded-2xl p-4 group cursor-pointer hover:border-sky-500/30 hover:bg-white/5 transition-all">
              <p className="text-sm text-text-primary leading-relaxed mb-3 pr-6 relative">
                {finding.text}
                <ChevronRight className="w-4 h-4 text-muted absolute right-0 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-muted bg-bg border border-stroke px-2 py-1 rounded-md flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-sky-400" />
                  {finding.proof}
                </span>
                
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
                  <div className={`w-1.5 h-1.5 rounded-full ${finding.confidence === 'High' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  {finding.confidence} Conf
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Execution Record */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-2">
          <CheckCircle2 className="w-4 h-4 text-muted" />
          <h3 className="text-sm font-medium text-text-primary">Execution Record</h3>
        </div>
        
        <div className="bg-surface border border-stroke rounded-2xl p-1 overflow-hidden">
          <div className="p-3 border-b border-stroke hover:bg-white/5 transition-colors flex justify-between items-center cursor-pointer">
            <span className="text-sm text-muted">Source Evidence</span>
            <span className="text-xs text-text-primary font-mono bg-bg px-2 py-1 rounded">sentinel2_coastal_2024.tif</span>
          </div>
          <div className="p-3 border-b border-stroke hover:bg-white/5 transition-colors flex justify-between items-center cursor-pointer">
            <span className="text-sm text-muted">Segmentation Model</span>
            <span className="text-xs text-text-primary font-mono bg-bg px-2 py-1 rounded">SegFormer-B4 v1.2</span>
          </div>
          <div className="p-3 border-b border-stroke hover:bg-white/5 transition-colors flex justify-between items-center cursor-pointer">
            <span className="text-sm text-muted">Physics Tool</span>
            <span className="text-xs text-text-primary font-mono bg-bg px-2 py-1 rounded">NDWI (Green, NIR)</span>
          </div>
          <div className="p-3 hover:bg-white/5 transition-colors flex justify-between items-center cursor-pointer">
            <span className="text-sm text-muted">Time Elapsed</span>
            <span className="text-xs text-text-primary font-mono bg-bg px-2 py-1 rounded">14.2s</span>
          </div>
        </div>
      </section>

      {/* 4. Limitations */}
      <section className="bg-yellow-500/5 border border-yellow-500/20 rounded-3xl p-5 md:p-6">
        <div className="flex items-center gap-2 text-yellow-400 mb-3">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="text-xs uppercase tracking-widest font-medium">Evidence Limitations</h3>
        </div>
        <p className="text-sm text-yellow-400/80 leading-relaxed mb-3">
          Clouds cover 4.2% of the total AOI. Water bodies beneath these clouds are excluded from the area measurement.
        </p>
        <div className="flex gap-2">
          <span className="text-[10px] uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded">Masked: Clouds</span>
        </div>
      </section>

    </div>
  );
}
