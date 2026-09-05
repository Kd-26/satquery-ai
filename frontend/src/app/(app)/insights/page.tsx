"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MapCanvas from "@/components/results/MapCanvas";
import LayerManager from "@/components/results/LayerManager";
import PairComparison from "@/components/results/PairComparison";
import EvidencePanel from "@/components/results/EvidencePanel";
import MeasurementTable from "@/components/results/MeasurementTable";
import ConfidenceBar from "@/components/results/ConfidenceBar";
import { Download, Share2, Printer, CheckCircle } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState("Semantic");
  const [compareMode, setCompareMode] = useState("swipe");

  return (
    <div className="min-h-screen bg-bg h-screen flex flex-col">
      <div className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-6 md:px-10 lg:px-12 pt-8 pb-8 h-full">
        
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 shrink-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Analysis Complete</span>
            </div>
            <h1 className="text-3xl md:text-4xl text-text-primary leading-[1.1]">
              Results <span className="font-display italic">workspace</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-stroke text-sm font-medium text-muted hover:text-text-primary hover:bg-white/5 transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-stroke text-sm font-medium text-muted hover:text-text-primary hover:bg-white/5 transition-colors">
              <Printer className="w-4 h-4" />
              Report
            </button>
            <button className="relative rounded-full text-sm transition-transform duration-200 hover:scale-105 group">
              <span className="absolute rounded-full accent-gradient opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={{ inset: "-1px" }} />
              <span className="relative z-10 flex items-center gap-2 px-6 py-2 rounded-full bg-bg text-text-primary font-medium">
                <Download className="w-4 h-4" />
                Export Package
              </span>
            </button>
          </div>
        </motion.div>

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Left: Map Viewer */}
          <motion.div 
            className="w-full lg:w-[65%] flex flex-col relative min-h-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            {/* Tab Strip */}
            <div className="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide shrink-0 pb-1">
              {["Source", "Semantic", "Change", "Quality"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab ? "text-text-primary" : "text-muted hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="insight-tab-bubble"
                      className="absolute inset-0 bg-white/10 rounded-full border border-white/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{tab} Layer</span>
                </button>
              ))}
            </div>

            <div className="relative flex-1 rounded-3xl overflow-hidden border border-stroke min-h-[400px]">
              <MapCanvas activeTab={activeTab} />
              <LayerManager />
              {activeTab === "Change" && (
                <PairComparison activeMode={compareMode} onModeChange={setCompareMode} />
              )}
            </div>
          </motion.div>

          {/* Right: Evidence & Data Hierarchy */}
          <motion.div 
            className="w-full lg:w-[35%] flex flex-col min-h-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
          >
            <ConfidenceBar />
            <MeasurementTable />
            <EvidencePanel />
          </motion.div>

        </div>
      </div>
    </div>
  );
}
