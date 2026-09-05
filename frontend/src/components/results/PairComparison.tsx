"use client";

import { useState } from "react";
import { SplitSquareHorizontal, MoveHorizontal, Blend, ArrowRightLeft } from "lucide-react";

interface PairComparisonProps {
  onModeChange: (mode: string) => void;
  activeMode: string;
}

export default function PairComparison({ onModeChange, activeMode }: PairComparisonProps) {
  const modes = [
    { id: "swipe", icon: MoveHorizontal, label: "Swipe" },
    { id: "side", icon: SplitSquareHorizontal, label: "Side-by-Side" },
    { id: "flicker", icon: ArrowRightLeft, label: "Flicker" },
    { id: "blend", icon: Blend, label: "Difference" },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-surface/80 backdrop-blur-md border border-stroke rounded-full p-1 shadow-lg">
      {modes.map(mode => {
        const Icon = mode.icon;
        const isActive = activeMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive ? "bg-text-primary text-bg" : "text-muted hover:text-text-primary hover:bg-white/5"
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
