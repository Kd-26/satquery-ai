"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box, FlaskConical, Wrench, Activity, X, ChevronRight, Cpu, Layers, Zap } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const TABS = ["Segmentation Models", "VLM Adapters", "Physics Tools"];

const SEGMENTATION_MODELS = [
  { name: "SegFormer-B4",        modality: "Optical",       bands: "RGB + NIR",   gsd: "10–30m", version: "1.2.0", status: "Active",   latency: "2.1s",  gpu: "A100",
    detail: { inputs: "4-band GeoTIFF (B2, B3, B4, B8)", outputs: "Binary mask + probability map", sensors: ["Sentinel-2", "Landsat 8"], domains: ["Water", "Vegetation", "Urban"], architecture: "Transformer encoder + MLP decoder", params: "25M", training: "SEN12-FLOOD + custom ISRO dataset" } },
  { name: "SegFormer-B2-Lite",   modality: "Optical",       bands: "RGB",         gsd: "30–60m", version: "1.0.4", status: "Active",   latency: "0.8s",  gpu: "V100",
    detail: { inputs: "3-band RGB (B2, B3, B4)", outputs: "Binary mask", sensors: ["Landsat 9", "PlanetScope"], domains: ["Urban", "Agriculture"], architecture: "Lightweight Transformer (6M params)", params: "6M", training: "OpenEarthMap" } },
  { name: "SAR U-Net",           modality: "SAR",           bands: "VV, VH",      gsd: "5–20m",  version: "2.0.1", status: "Active",   latency: "3.4s",  gpu: "A100",
    detail: { inputs: "2-band SAR (VV, VH) in dB", outputs: "Flood mask + confidence", sensors: ["Sentinel-1", "RISAT"], domains: ["Flood Mapping", "Ship Detection"], architecture: "U-Net with Squeeze-Excitation blocks", params: "31M", training: "Copernicus EMS + S1 Flood" } },
  { name: "Change-Detector-v3",  modality: "Multi-temporal", bands: "T1+T2 RGB",  gsd: "10–30m", version: "3.0.0", status: "Testing",  latency: "4.8s",  gpu: "A100",
    detail: { inputs: "2×3-band RGB pair (T1+T2)", outputs: "Change map + change type labels", sensors: ["Sentinel-2", "Landsat 8/9"], domains: ["Deforestation", "Urbanization", "Disaster"], architecture: "Siamese U-Net with attention", params: "47M", training: "LEVIR-CD + DSIFN" } },
  { name: "SegFormer-B5-SAR",    modality: "SAR",           bands: "VV, VH, RVI", gsd: "5–15m",  version: "0.9.2", status: "Inactive", latency: "5.2s",  gpu: "A100",
    detail: { inputs: "3-band SAR (VV, VH, RVI)", outputs: "Vegetation density mask", sensors: ["Sentinel-1", "ALOS-2"], domains: ["Agriculture", "Vegetation Monitoring"], architecture: "SegFormer-B5 + SAR adapter", params: "84M", training: "Sen4AgriNet" } },
];

const VLM_ADAPTERS = [
  { name: "Explanation-v2",  task: "Explanation",  qwen: "Qwen2-VL-7B", rank: 16,  version: "2.0.1", status: "Active",   compat: "All",
    detail: { inputs: "Image + segmentation mask + user query", outputs: "Natural language explanation with confidence", sensors: ["All sensors"], domains: ["All domains"], architecture: "LoRA rank-16 on Qwen2-VL-7B", params: "LoRA: 2.4M", training: "SatQA-v2 + RSVQA" } },
  { name: "Grounding-v1",    task: "Grounding",    qwen: "Qwen2-VL-7B", rank: 8,   version: "1.1.0", status: "Active",   compat: "Optical",
    detail: { inputs: "RGB image + text query", outputs: "Bounding box coordinates + confidence", sensors: ["Sentinel-2", "Landsat", "PlanetScope"], domains: ["Object Detection", "Scene Understanding"], architecture: "LoRA rank-8 with visual grounding head", params: "LoRA: 1.2M", training: "DOTA + RSVGD" } },
  { name: "TemporalFuse-v1", task: "Temporal",     qwen: "Qwen2-VL-7B", rank: 32,  version: "1.0.2", status: "Testing",  compat: "Multi-temporal",
    detail: { inputs: "T1 + T2 image pair + query", outputs: "Change description + magnitude estimate", sensors: ["Sentinel-1", "Sentinel-2"], domains: ["Change Detection", "Temporal Analysis"], architecture: "LoRA rank-32 with temporal attention fusion", params: "LoRA: 4.8M", training: "xBD + SECOND" } },
];

const PHYSICS_TOOLS = [
  { name: "NDWI",     formula: "(Green − NIR) / (Green + NIR)", bands: "Green, NIR",    unit: "Index [−1,1]",  status: "Stable",
    detail: { inputs: "Band 3 (Green) + Band 8 (NIR)", outputs: "NDWI raster float32 + threshold mask", sensors: ["Sentinel-2", "Landsat 8/9"], domains: ["Water Mapping", "Flood Detection"], architecture: "Analytical formula + Otsu threshold", params: "—", training: "—" } },
  { name: "NDVI",     formula: "(NIR − Red) / (NIR + Red)",     bands: "Red, NIR",      unit: "Index [−1,1]",  status: "Stable",
    detail: { inputs: "Band 4 (Red) + Band 8 (NIR)", outputs: "NDVI raster float32", sensors: ["Sentinel-2", "Landsat", "MODIS"], domains: ["Vegetation Health", "Agriculture"], architecture: "Analytical formula", params: "—", training: "—" } },
  { name: "NDBI",     formula: "(SWIR − NIR) / (SWIR + NIR)",   bands: "SWIR, NIR",     unit: "Index [−1,1]",  status: "Stable",
    detail: { inputs: "Band 11 (SWIR) + Band 8 (NIR)", outputs: "NDBI raster float32", sensors: ["Sentinel-2", "Landsat 8/9"], domains: ["Urban Mapping", "Built-up Area"], architecture: "Analytical formula", params: "—", training: "—" } },
  { name: "MNDWI",    formula: "(Green − SWIR) / (Green+SWIR)", bands: "Green, SWIR",   unit: "Index [−1,1]",  status: "Stable",
    detail: { inputs: "Band 3 (Green) + Band 11 (SWIR)", outputs: "MNDWI raster float32 + mask", sensors: ["Sentinel-2", "Landsat 8/9"], domains: ["Water Mapping (urban-robust)"], architecture: "Analytical formula", params: "—", training: "—" } },
  { name: "SAR Ratio",formula: "VV / VH",                        bands: "VV, VH (SAR)",  unit: "Ratio [dB]",    status: "Stable",
    detail: { inputs: "VV + VH SAR backscatter bands", outputs: "Ratio raster [dB]", sensors: ["Sentinel-1", "RISAT-2"], domains: ["Soil Moisture", "Ship Detection"], architecture: "Analytical formula", params: "—", training: "—" } },
  { name: "Area Calc",formula: "Spheroid surface projection",    bands: "Georef+Mask",   unit: "km², m²",       status: "Stable",
    detail: { inputs: "Binary mask + CRS metadata", outputs: "Area in km² / m² + perimeter", sensors: ["All sensors"], domains: ["All domains"], architecture: "Spherical approximation using haversine", params: "—", training: "—" } },
];

const statusColor: Record<string, string> = {
  Active:   "bg-green-500/20 text-green-400",
  Testing:  "bg-yellow-500/20 text-yellow-400",
  Inactive: "bg-red-500/20 text-red-400",
  Stable:   "bg-green-500/20 text-green-400",
};

type DrawerItem = {
  name: string;
  status: string;
  detail: {
    inputs: string;
    outputs: string;
    sensors: string[];
    domains: string[];
    architecture: string;
    params: string;
    training: string;
  };
} & Record<string, unknown>;

export default function RegistryPage() {
  const [tab, setTab] = useState(0);
  const [drawerItem, setDrawerItem] = useState<DrawerItem | null>(null);

  const openDrawer = (item: DrawerItem) => setDrawerItem(item);
  const closeDrawer = () => setDrawerItem(null);

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
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Model &amp; Tool Inventory</span>
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
          <motion.div key="seg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="bg-surface border border-stroke rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg border-b border-stroke">
                  <tr>
                    {["Model", "Modality", "Bands", "GSD Range", "Version", "Latency", "Status", ""].map(h => (
                      <th key={h} className="px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {SEGMENTATION_MODELS.map((m) => (
                    <tr key={m.name} onClick={() => openDrawer(m as DrawerItem)} className="group hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="px-5 py-4 font-medium text-text-primary group-hover:text-sky-400 transition-colors">{m.name}</td>
                      <td className="px-5 py-4 text-muted">{m.modality}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{m.bands}</td>
                      <td className="px-5 py-4 text-muted">{m.gsd}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{m.version}</td>
                      <td className="px-5 py-4 text-muted">{m.latency}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[m.status]}`}>{m.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight className="w-4 h-4 text-muted group-hover:text-sky-400 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 1 && (
          <motion.div key="vlm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="bg-surface border border-stroke rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg border-b border-stroke">
                  <tr>
                    {["Adapter Name", "Task", "Base VLM", "LoRA Rank", "Version", "Compatibility", "Status", ""].map(h => (
                      <th key={h} className="px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {VLM_ADAPTERS.map((a) => (
                    <tr key={a.name} onClick={() => openDrawer(a as DrawerItem)} className="group hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="px-5 py-4 font-medium text-text-primary group-hover:text-sky-400 transition-colors">{a.name}</td>
                      <td className="px-5 py-4 text-muted">{a.task}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{a.qwen}</td>
                      <td className="px-5 py-4 text-muted">{a.rank}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{a.version}</td>
                      <td className="px-5 py-4 text-muted">{a.compat}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[a.status]}`}>{a.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight className="w-4 h-4 text-muted group-hover:text-sky-400 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 2 && (
          <motion.div key="tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="bg-surface border border-stroke rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg border-b border-stroke">
                  <tr>
                    {["Tool", "Formula", "Required Bands", "Output Unit", "Status", ""].map(h => (
                      <th key={h} className="px-5 py-3.5 text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {PHYSICS_TOOLS.map((t) => (
                    <tr key={t.name} onClick={() => openDrawer(t as DrawerItem)} className="group hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="px-5 py-4 font-medium text-text-primary group-hover:text-sky-400 transition-colors">{t.name}</td>
                      <td className="px-5 py-4 text-muted font-mono text-xs">{t.formula}</td>
                      <td className="px-5 py-4 text-muted">{t.bands}</td>
                      <td className="px-5 py-4 text-muted">{t.unit}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight className="w-4 h-4 text-muted group-hover:text-sky-400 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* Slideover Drawer */}
      <AnimatePresence>
        {drawerItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-screen w-full max-w-sm bg-bg border-l border-stroke z-50 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="h-16 border-b border-stroke flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[drawerItem.status]}`}>
                    {drawerItem.status}
                  </span>
                  <h3 className="font-medium text-text-primary truncate">{drawerItem.name}</h3>
                </div>
                <button onClick={closeDrawer} className="p-1.5 text-muted hover:text-text-primary rounded-lg hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* I/O Contract */}
                <div>
                  <h4 className="text-[10px] text-muted uppercase tracking-[0.2em] mb-3">I/O Contract</h4>
                  <div className="space-y-3">
                    <div className="bg-surface border border-stroke rounded-2xl p-4">
                      <p className="text-[10px] text-sky-400 uppercase tracking-wider mb-1.5">Inputs</p>
                      <p className="text-xs text-text-primary leading-relaxed">{drawerItem.detail.inputs}</p>
                    </div>
                    <div className="bg-surface border border-stroke rounded-2xl p-4">
                      <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1.5">Outputs</p>
                      <p className="text-xs text-text-primary leading-relaxed">{drawerItem.detail.outputs}</p>
                    </div>
                  </div>
                </div>

                {/* Sensor Compatibility */}
                <div>
                  <h4 className="text-[10px] text-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Sensor Compatibility
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {drawerItem.detail.sensors.map((s) => (
                      <span key={s} className="text-[10px] px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Domains */}
                <div>
                  <h4 className="text-[10px] text-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Application Domains
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {drawerItem.detail.domains.map((d) => (
                      <span key={d} className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Technical Metadata */}
                <div>
                  <h4 className="text-[10px] text-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" /> Technical Metadata
                  </h4>
                  <div className="bg-surface border border-stroke rounded-2xl divide-y divide-stroke overflow-hidden">
                    {[
                      { label: "Architecture", value: drawerItem.detail.architecture },
                      { label: "Parameters", value: drawerItem.detail.params },
                      { label: "Training Data", value: drawerItem.detail.training },
                    ].map(row => (
                      <div key={row.label} className="flex items-start gap-4 px-4 py-3">
                        <span className="text-[10px] text-muted uppercase tracking-wider w-24 shrink-0 pt-px">{row.label}</span>
                        <span className="text-xs text-text-primary leading-relaxed">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
