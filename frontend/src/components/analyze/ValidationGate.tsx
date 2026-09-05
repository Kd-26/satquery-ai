"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, ChevronRight, ShieldAlert } from "lucide-react";

type CheckStatus = "pass" | "warn" | "fail";

const CHECKS = [
  { id: "1", label: "Geospatial Identity", status: "pass" as CheckStatus, detail: "CRS: EPSG:4326 verified. Bounding box valid." },
  { id: "2", label: "Optical Quality", status: "pass" as CheckStatus, detail: "Cloud cover 4.2% — below 10% threshold." },
  { id: "3", label: "Sensor Calibration", status: "warn" as CheckStatus, detail: "Minor radiometric calibration variance detected." },
  { id: "4", label: "Temporal Metadata", status: "warn" as CheckStatus, detail: "Acquisition date inferred from file system, not EXIF/GeoTIFF tags." },
];

const statusIcon: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />,
  warn: <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />,
  fail: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
};

export default function ValidationGate({ onComplete }: { onComplete: () => void }) {
  const [openCheck, setOpenCheck] = useState<string | null>(null);

  const warnings = CHECKS.filter(c => c.status === "warn").length;
  const failures = CHECKS.filter(c => c.status === "fail").length;

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-sky-400" />
          Validation Gate
        </h3>
        {failures > 0 ? (
          <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400">{failures} Blockers</span>
        ) : warnings > 0 ? (
          <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400">{warnings} Warnings</span>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">All checks passed</span>
        )}
      </div>

      <div className="bg-surface border border-stroke rounded-3xl overflow-hidden">
        {CHECKS.map((check, i) => (
          <motion.div
            key={check.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={`border-b border-stroke last:border-0 ${check.status === "fail" ? "bg-red-500/5" : ""}`}
          >
            <button
              onClick={() => setOpenCheck(openCheck === check.id ? null : check.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
            >
              {statusIcon[check.status]}
              <span className="text-sm text-text-primary flex-1 font-medium">{check.label}</span>
              <ChevronRight className={`w-4 h-4 text-muted transition-transform ${openCheck === check.id ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {openCheck === check.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm text-muted px-12 pb-4">{check.detail}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={onComplete}
          disabled={failures > 0}
          className={`relative rounded-full text-sm transition-transform duration-200 ${failures > 0 ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
        >
          {failures === 0 && <span className="absolute rounded-full accent-gradient" style={{ inset: "-2px" }} />}
          <span className={`relative z-10 block px-6 py-2.5 rounded-full font-medium ${failures > 0 ? "bg-stroke text-muted" : "bg-bg text-text-primary"}`}>
            Proceed to Query
          </span>
        </button>
      </div>
    </div>
  );
}
