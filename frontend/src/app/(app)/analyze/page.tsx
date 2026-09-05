"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StepIndicator from "@/components/analyze/StepIndicator";
import DropZone, { type UploadedFile } from "@/components/analyze/DropZone";
import MetadataCards from "@/components/analyze/MetadataCards";
import BandMapper from "@/components/analyze/BandMapper";
import ValidationGate from "@/components/analyze/ValidationGate";
import QueryComposer from "@/components/analyze/QueryComposer";
import PlanReview from "@/components/analyze/PlanReview";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

export default function AnalyzePage() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"simple" | "scientific">("simple");
  const [files, setFiles] = useState<UploadedFile[]>([]);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[900px] mx-auto px-6 md:px-10 lg:px-16 pt-12 pb-20">
        
        {/* Header & Mode Switcher */}
        <motion.div
          className="mb-10 px-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-8 h-px bg-stroke" />
                <span className="text-xs text-muted uppercase tracking-[0.3em]">Analysis Workspace</span>
              </div>
              <h1 className="text-4xl md:text-5xl text-text-primary leading-[1.1]">
                New <span className="font-display italic">analysis</span>
              </h1>
            </div>
          </div>
        </motion.div>

        {/* 4-Step Indicator */}
        <StepIndicator currentStep={step} />

        {/* Step Content with Animation */}
        <div className="relative mt-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <DropZone 
                  onFilesAccepted={(f) => {
                    setFiles(f);
                    setStep(2);
                  }}
                  maxFiles={2}
                />
              </motion.div>
            )}

            {/* Step 2: Inspect & Validate */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <MetadataCards files={files} />
                {files[0]?.metadata?.isGeoTiff && <BandMapper file={files[0]} />}
                <ValidationGate onComplete={() => setStep(3)} />
                
                <button 
                  onClick={() => setStep(1)}
                  className="mt-6 text-sm text-muted hover:text-text-primary underline decoration-stroke underline-offset-4 transition-colors"
                >
                  ← Back to Upload
                </button>
              </motion.div>
            )}

            {/* Step 3: Query Formulation */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <QueryComposer mode={mode} onComplete={() => setStep(4)} />
                
                <button 
                  onClick={() => setStep(2)}
                  className="mt-6 text-sm text-muted hover:text-text-primary underline decoration-stroke underline-offset-4 transition-colors"
                >
                  ← Back to Inspection
                </button>
              </motion.div>
            )}

            {/* Step 4: Plan Review */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <PlanReview mode={mode} />
                
                <button 
                  onClick={() => setStep(3)}
                  className="mt-6 text-sm text-muted hover:text-text-primary underline decoration-stroke underline-offset-4 transition-colors"
                >
                  ← Back to Query
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
