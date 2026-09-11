"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const STEPS = ["Upload", "Inspect", "Query", "Plan"];

export default function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isPast = currentStep > stepNum;
        const isClickable = isPast && !!onStepClick;
        
        return (
          <div key={step} className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(stepNum)}
              className={`flex items-center gap-2 transition-all ${
                isClickable ? "cursor-pointer hover:opacity-80 group" : "cursor-default"
              }`}
            >
              <div 
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                  isActive ? "bg-sky-500/20 text-sky-400 border border-sky-500/50" :
                  isPast ? "bg-text-primary text-bg group-hover:bg-sky-400 group-hover:text-black" :
                  "bg-surface border border-stroke text-muted"
                }`}
              >
                {isPast ? <Check className="w-3 h-3" /> : stepNum}
              </div>
              
              <span className={`text-xs uppercase tracking-wider font-medium transition-colors ${
                isActive ? "text-text-primary" :
                isPast ? "text-text-primary group-hover:text-sky-400" : "text-muted"
              }`}>
                {step}
              </span>
            </button>
            
            {index < STEPS.length - 1 && (
              <span className="w-6 h-px bg-stroke mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}
