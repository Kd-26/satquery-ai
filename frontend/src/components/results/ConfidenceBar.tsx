"use client";

interface ConfidenceBarProps {
  confidence?: number | null; // 0-100
}

export default function ConfidenceBar({ confidence }: ConfidenceBarProps) {
  const pct = confidence ?? 0;
  const color =
    pct >= 85 ? "bg-green-400" : pct >= 60 ? "bg-yellow-400" : "bg-red-400";
  const label =
    pct >= 85 ? "High" : pct >= 60 ? "Moderate" : confidence == null ? "—" : "Low";

  return (
    <div className="bg-surface border border-stroke rounded-3xl p-5 mb-4 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted uppercase tracking-widest">Overall Confidence</span>
        <span className="text-sm font-medium text-text-primary">
          {confidence != null ? `${pct}%` : "Pending…"}
        </span>
      </div>
      <div className="w-full h-2 bg-stroke/40 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted mt-2">{label} confidence</p>
    </div>
  );
}
