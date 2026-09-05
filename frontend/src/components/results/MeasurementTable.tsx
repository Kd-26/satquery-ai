"use client";

import { BarChart3 } from "lucide-react";

export default function MeasurementTable() {
  const metrics = [
    { label: "Total Water Area", value: "14.2", unit: "km²", change: "-2.1%", trend: "down" },
    { label: "Detected Polygons", value: "128", unit: "count", change: "+12", trend: "up" },
    { label: "Max NDWI", value: "0.84", unit: "idx", change: "0.0", trend: "neutral" },
    { label: "Avg Perimeter", value: "1.2", unit: "km", change: "-0.1", trend: "down" },
  ];

  return (
    <div className="bg-surface border border-stroke rounded-3xl p-4 md:p-6 mb-6">
      <div className="flex items-center gap-2 mb-4 px-1">
        <BarChart3 className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-medium text-text-primary">Measured Outputs</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-bg border border-stroke rounded-2xl p-4 flex flex-col justify-between group hover:border-sky-500/30 transition-colors">
            <span className="text-xs text-muted font-medium mb-3 group-hover:text-text-primary transition-colors">{m.label}</span>
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl text-text-primary font-display">{m.value}</span>
                <span className="text-xs text-muted">{m.unit}</span>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                m.trend === 'up' ? 'text-green-400 bg-green-500/10' :
                m.trend === 'down' ? 'text-red-400 bg-red-500/10' :
                'text-muted bg-white/5'
              }`}>
                {m.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
