"use client";

import { SplitSquareHorizontal, MoveHorizontal, Blend, ArrowRightLeft } from "lucide-react";
import type { CompareMode } from "@/components/results/MapCanvas";

interface PairComparisonProps {
  onModeChange: (mode: CompareMode) => void;
  activeMode: CompareMode;
}

const MODES: { id: CompareMode; icon: typeof MoveHorizontal; label: string; tooltip: string }[] = [
  {
    id: "swipe",
    icon: MoveHorizontal,
    label: "Swipe",
    tooltip: "Drag a vertical divider to compare Source vs overlay side-by-side",
  },
  {
    id: "side",
    icon: SplitSquareHorizontal,
    label: "Side-by-Side",
    tooltip: "View Source and overlay in two separate panels",
  },
  {
    id: "flicker",
    icon: ArrowRightLeft,
    label: "Flicker",
    tooltip: "Rapidly alternate between Source and overlay to spot differences",
  },
  {
    id: "blend",
    icon: Blend,
    label: "Difference",
    tooltip: "Blend layers using CSS difference mode to highlight changes",
  },
];

export default function PairComparison({ onModeChange, activeMode }: PairComparisonProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-surface/80 backdrop-blur-md border border-stroke rounded-full p-1 shadow-lg">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = activeMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            title={mode.tooltip}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive
                ? "bg-text-primary text-bg shadow-sm"
                : "text-muted hover:text-text-primary hover:bg-white/5"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
