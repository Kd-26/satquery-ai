"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Box, FlaskConical, Wrench, Activity, ChevronRight, Circle } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const TABS = ["Segmentation Models", "VLM Adapters", "Physics Tools"];

const SEGMENTATION_MODELS = [
  { name: "SegFormer-B4",        modality: "Optical",       bands: "RGB + NIR",   gsd: "10–30m", version: "1.2.0", status: "Active",   latency: "2.1s",  gpu: "A100" },
  { name: "SegFormer-B2-Lite",   modality: "Optical",       bands: "RGB",         gsd: "30–60m", version: "1.0.4", status: "Active",   latency: "0.8s",  gpu: "V100" },
  { name: "SAR U-Net",           modality: "SAR",           bands: "VV, VH",      gsd: "5–20m",  version: "2.0.1", status: "Active",   latency: "3.4s",  gpu: "A100" },
  { name: "Change-Detector-v3",  modality: "Multi-temporal", bands: "T1+T2 RGB",   gsd: "10–30m", version: "3.0.0", status: "Testing",  latency: "4.8s",  gpu: "A100" },
  { name: "SegFormer-B5-SAR",    modality: "SAR",           bands: "VV, VH, RVI", gsd: "5–15m",  version: "0.9.2", status: "Inactive", latency: "5.2s",  gpu: "A100" },
];

const VLM_ADAPTERS = [
  { name: "Explanation-v2",  task: "Explanation",  qwen: "Qwen2-VL-7B", rank: 16,  version: "2.0.1", status: "Active",   compat: "All" },
  { name: "Grounding-v1",    task: "Grounding",    qwen: "Qwen2-VL-7B", rank: 8,   version: "1.1.0", status: "Active",   compat: "Optical" },
  { name: "TemporalFuse-v1", task: "Temporal",     qwen: "Qwen2-VL-7B", rank: 32,  version: "1.0.2", status: "Testing",  compat: "Multi-temporal" },
];

const PHYSICS_TOOLS = [
  { name: "NDWI",     formula: "(Green − NIR) / (Green + NIR)", bands: "Green, NIR",    unit: "Index [−1,1]",  status: "Stable" },
  { name: "NDVI",     formula: "(NIR − Red) / (NIR + Red)",     bands: "Red, NIR",      unit: "Index [−1,1]",  status: "Stable" },
  { name: "NDBI",     formula: "(SWIR − NIR) / (SWIR + NIR)",   bands: "SWIR, NIR",     unit: "Index [−1,1]",  status: "Stable" },
  { name: "MNDWI",    formula: "(Green − SWIR) / (Green+SWIR)", bands: "Green, SWIR",   unit: "Index [−1,1]",  status: "Stable" },
  { name: "SAR Ratio",formula: "VV / VH",                        bands: "VV, VH (SAR)",  unit: "Ratio [dB]",    status: "Stable" },
  { name: "Area Calc",formula: "Spheroid surface projection",    bands: "Georef+Mask",   unit: "km², m²",       status: "Stable" },
];

const statusColor: Record<string, string> = {
  Active:   "bg-green-500/20 text-green-400",
  Testing:  "bg-yellow-500/20 text-yellow-400",
  Inactive: "bg-red-500/20 text-red-400",
  Stable:   "bg-green-500/20 text-green-400",
};

export default function RegistryPage() {
  const [tab, setTab] = useState(0);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-12 pt-8 pb-20">

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Model & Tool Inventory</span>
          </div>
          <h1 className="text-4xl md:text-5xl text-text-primary leading-[1.1]">
            Model <span className="font-display italic">registry</span>
          </h1>
        </motion.div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                tab === i ? "text-text-primary" : "text-muted hover:text-text-primary hover:bg-white/5"
              }`}
            >
              {tab === i && (
                <motion.div
                  layoutId="reg-tab-pill"
                  className="absolute inset-0 bg-white/10 rounded-full border border-white/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{t}</span>
            </button>
          ))}
        </div>

        {/* Tables */}
        {tab === 0 && (
          <motion.div
            key="seg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-surface border border-stroke rounded-3xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg border-b border-stroke">
                  <tr>
                    {["Model", "Modality", "Bands", "GSD Range", "Version", "Latency", "Status"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {SEGMENTATION_MODELS.map((m) => (
                    <tr key={m.name} className="group hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="px-5 py-4 font-medium text-text-primary group-hover:text-sky-400 transition-colors">{m.name}</td>
                      <td className="px-5 py-4 text-muted">{m.modality}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{m.bands}</td>
                      <td className="px-5 py-4 text-muted">{m.gsd}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{m.version}</td>
                      <td className="px-5 py-4 text-muted">{m.latency}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[m.status]}`}>{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 1 && (
          <motion.div
            key="vlm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-surface border border-stroke rounded-3xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg border-b border-stroke">
                  <tr>
                    {["Adapter Name", "Task", "Base VLM", "LoRA Rank", "Version", "Compatibility", "Status"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {VLM_ADAPTERS.map((a) => (
                    <tr key={a.name} className="group hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="px-5 py-4 font-medium text-text-primary group-hover:text-sky-400 transition-colors">{a.name}</td>
                      <td className="px-5 py-4 text-muted">{a.task}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{a.qwen}</td>
                      <td className="px-5 py-4 text-muted">{a.rank}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{a.version}</td>
                      <td className="px-5 py-4 text-muted">{a.compat}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[a.status]}`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 2 && (
          <motion.div
            key="tools"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-surface border border-stroke rounded-3xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg border-b border-stroke">
                  <tr>
                    {["Tool", "Formula", "Required Bands", "Output Unit", "Status"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {PHYSICS_TOOLS.map((t) => (
                    <tr key={t.name} className="group hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="px-5 py-4 font-medium text-text-primary group-hover:text-sky-400 transition-colors">{t.name}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{t.formula}</td>
                      <td className="px-5 py-4 text-muted">{t.bands}</td>
                      <td className="px-5 py-4 text-muted">{t.unit}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[t.status]}`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
