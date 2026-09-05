"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
}

const STEPS = ["Upload", "Inspect", "Query", "Plan"];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isPast = currentStep > stepNum;
        
        return (
          <div key={step} className="flex items-center gap-2">
            <div 
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                isActive ? "bg-sky-500/20 text-sky-400 border border-sky-500/50" :
                isPast ? "bg-text-primary text-bg" :
                "bg-surface border border-stroke text-muted"
              }`}
            >
              {isPast ? <Check className="w-3 h-3" /> : stepNum}
            </div>
            
            <span className={`text-xs uppercase tracking-wider font-medium transition-colors ${
              isActive || isPast ? "text-text-primary" : "text-muted"
            }`}>
              {step}
            </span>
            
            {index < STEPS.length - 1 && (
              <span className="w-6 h-px bg-stroke mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}
