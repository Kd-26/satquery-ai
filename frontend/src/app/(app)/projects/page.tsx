"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, Filter, FolderOpen, Copy, RotateCcw, ChevronRight, CalendarDays } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const ALL_PROJECTS = [
  { slug: "coastal-erosion",  title: "Coastal Erosion Analysis",       type: "Temporal Comparison",     gradient: "from-sky-500 via-blue-400/60 to-transparent",    tags: ["Sentinel-2","NDVI","Multitemporal"], status: "Completed", date: "Sep 03, 2026", sensor: "Sentinel-2", region: "Mumbai Coast" },
  { slug: "urban-sprawl",     title: "Urban Sprawl – Region 4",        type: "Optical Segmentation",    gradient: "from-violet-500 via-fuchsia-400/60 to-transparent",tags: ["Landsat 9","SAR"],                 status: "Failed",    date: "Sep 01, 2026", sensor: "Landsat 9",  region: "NCR Delhi"   },
  { slug: "flood-mapping",    title: "Flood Inundation Mapping",       type: "Optical-SAR Fusion",      gradient: "from-emerald-500 via-teal-400/60 to-transparent",  tags: ["Sentinel-1","DEM"],                status: "Completed", date: "Aug 29, 2026", sensor: "Sentinel-1", region: "Bihar Plains"},
  { slug: "deforestation",    title: "Amazon Deforestation Watch",     type: "Change Detection",        gradient: "from-amber-500 via-orange-400/60 to-transparent",  tags: ["MODIS","NDVI","Time-series"],       status: "Running",   date: "Aug 27, 2026", sensor: "MODIS",      region: "Amazon Basin"},
  { slug: "ship-detect",      title: "Harbor Ship Detection",          type: "Object Detection",        gradient: "from-cyan-500 via-sky-400/60 to-transparent",     tags: ["SAR","VV/VH","Sentinel-1"],        status: "Completed", date: "Aug 20, 2026", sensor: "Sentinel-1", region: "Mumbai Port" },
  { slug: "glacier-retreat",  title: "Glacier Retreat Mapping",        type: "Temporal Comparison",     gradient: "from-blue-400 via-indigo-500/60 to-transparent",  tags: ["Landsat","Multitemporal"],          status: "Completed", date: "Aug 15, 2026", sensor: "Landsat",    region: "Himalayas"   },
];

const STATUS_FILTERS = ["All", "Completed", "Running", "Failed"];
const SENSOR_FILTERS = ["All Sensors", "Sentinel-2", "Sentinel-1", "Landsat 9", "Landsat", "MODIS"];

const statusColor: Record<string, string> = {
  Completed: "bg-green-500/20 text-green-400",
  Failed:    "bg-red-500/20 text-red-400",
  Running:   "bg-blue-500/20 text-blue-400 animate-pulse",
};

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [sensorFilter, setSensorFilter] = useState("All Sensors");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = ALL_PROJECTS.filter(p => {
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const matchSensor = sensorFilter === "All Sensors" || p.sensor === sensorFilter;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                        p.region.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSensor && matchSearch;
  });

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-12 pt-8 pb-20">

        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">All Work</span>
          </div>
          <h1 className="text-4xl md:text-5xl text-text-primary leading-[1.1]">
            Analysis <span className="font-display italic">projects</span>
          </h1>
        </motion.div>

        {/* Search & Filters Bar */}
        <motion.div
          className="flex flex-col md:flex-row gap-3 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or region…"
              className="w-full bg-surface border border-stroke rounded-full pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-muted outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  statusFilter === f
                    ? "bg-text-primary text-bg"
                    : "border border-stroke text-muted hover:text-text-primary hover:bg-white/5"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sensor Filter */}
          <select
            value={sensorFilter}
            onChange={(e) => setSensorFilter(e.target.value)}
            className="bg-surface border border-stroke rounded-full px-4 py-2.5 text-sm text-muted outline-none cursor-pointer"
          >
            {SENSOR_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </motion.div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted">{filtered.length} project{filtered.length !== 1 ? "s" : ""} found</p>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {filtered.map((project, i) => {
              const col = i % 3 === 0 ? "md:col-span-7" : i % 3 === 1 ? "md:col-span-5" : "md:col-span-12";
              return (
                <motion.div
                  key={project.slug}
                  className={col}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease }}
                >
                  <Link href="/insights">
                    <div className="group bg-surface border border-stroke rounded-3xl aspect-[4/3] relative overflow-hidden transition-colors duration-300 hover:border-transparent">
                      {/* Gradient bg */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient} opacity-30 group-hover:opacity-50 transition-opacity duration-500`} />
                      
                      {/* Halftone pattern */}
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "4px 4px" }} />
                      
                      {/* Grid lines */}
                      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />

                      {/* Top meta */}
                      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                        <span className="text-xs text-muted/70 flex items-center gap-1.5">
                          <CalendarDays className="w-3 h-3" />
                          {project.date}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[project.status]}`}>{project.status}</span>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute inset-0 backdrop-blur-[0px] group-hover:backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {project.tags.map(tag => (
                            <span key={tag} className="text-[10px] uppercase tracking-wider text-muted bg-black/30 px-2 py-0.5 rounded-full border border-white/10">{tag}</span>
                          ))}
                        </div>
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">{project.type}</p>
                        <h3 className="text-lg text-text-primary font-medium">{project.title}</h3>
                        <p className="text-xs text-muted mt-1">{project.region}</p>
                      </div>

                      {/* Hover CTA */}
                      <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        <div className="flex gap-3">
                          <span className="px-5 py-2 rounded-full bg-white text-black text-xs font-medium flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5" /> Open
                          </span>
                          <span className="px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5 border border-white/20">
                            <Copy className="w-3.5 h-3.5" /> Clone
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 text-muted">
            <p className="text-4xl font-display italic mb-4">No results</p>
            <p className="text-sm">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
}
