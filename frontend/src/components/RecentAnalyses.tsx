"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const analyses = [
  {
    slug: "coastal-erosion",
    title: "Coastal Erosion Analysis",
    type: "Temporal Comparison",
    gradient: "from-sky-500 via-blue-400/60 to-transparent",
    tags: ["Sentinel-2", "NDVI", "Multitemporal"],
    status: "Completed",
  },
  {
    slug: "urban-sprawl",
    title: "Urban Sprawl – Region 4",
    type: "Optical Segmentation",
    gradient: "from-violet-500 via-fuchsia-400/60 to-transparent",
    tags: ["Landsat 9", "SAR"],
    status: "Failed",
  },
  {
    slug: "flood-mapping",
    title: "Flood Inundation Mapping",
    type: "Optical-SAR Fusion",
    gradient: "from-emerald-500 via-teal-400/60 to-transparent",
    tags: ["Sentinel-1", "DEM"],
    status: "Completed",
  },
  {
    slug: "deforestation",
    title: "Amazon Deforestation Watch",
    type: "Change Detection",
    gradient: "from-amber-500 via-orange-400/60 to-transparent",
    tags: ["MODIS", "NDVI", "Time-series"],
    status: "Running",
  },
];

const colSpans = [
  "md:col-span-7",
  "md:col-span-5",
  "md:col-span-5",
  "md:col-span-7",
];
const aspectClasses = [
  "aspect-[4/3]",
  "aspect-[4/3] md:aspect-auto md:h-full",
  "aspect-[4/3] md:aspect-auto md:h-full",
  "aspect-[4/3]",
];
const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const statusColors: Record<string, string> = {
  Completed: "bg-green-500/20 text-green-400",
  Failed: "bg-red-500/20 text-red-400",
  Running: "bg-blue-500/20 text-blue-400",
};

const ViewAllButton = ({ className = "" }: { className?: string }) => (
  <Link
    href="/projects"
    className={`group relative inline-flex items-center gap-3 px-5 py-3 bg-bg border-2 border-stroke rounded-full text-sm text-muted transition-colors ${className}`}
  >
    <span
      className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-[#89AACC] to-[#4E85BF] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ margin: "-2px" }}
    >
      <span className="block w-full h-full rounded-full bg-bg" />
    </span>
    <span className="relative z-10">View all analyses</span>
    <svg
      className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  </Link>
);

const RecentAnalyses = () => {
  return (
    <section className="bg-bg py-12 md:py-16 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 md:mb-16 px-2"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">
                Recent Work
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-text-primary leading-[1.1]">
              Recent{" "}
              <span className="font-display italic">analyses</span>
            </h2>
            <p className="text-muted text-sm md:text-base mt-3 max-w-md">
              A selection of satellite intelligence analyses run on SatQuery AI.
            </p>
          </div>
          <ViewAllButton className="hidden md:inline-flex" />
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 px-2">
          {analyses.map((analysis, i) => (
            <motion.div
              key={analysis.slug}
              className={`${colSpans[i]}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: i * 0.1, ease }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <Link href={`/insights`}>
                <div
                  className={`group bg-surface border border-stroke rounded-3xl ${aspectClasses[i]} relative overflow-hidden transition-colors duration-300 hover:border-transparent`}
                >
                  {/* Gradient background */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${analysis.gradient} opacity-30 group-hover:opacity-50 transition-opacity duration-500`}
                  />
                  {/* Halftone overlay */}
                  <div
                    className="absolute inset-0 opacity-10 mix-blend-multiply"
                    style={{
                      backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
                      backgroundSize: "4px 4px",
                    }}
                  />
                  {/* Grid pattern */}
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                      backgroundSize: "40px 40px",
                    }}
                  />

                  {/* Status pill */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[analysis.status]}`}>
                      {analysis.status}
                    </span>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 backdrop-blur-[0px] group-hover:backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />

                  {/* Content always visible */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {analysis.tags.map((tag) => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider text-muted bg-black/30 px-2 py-0.5 rounded-full border border-white/10">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">{analysis.type}</p>
                    <h3 className="text-lg text-text-primary font-medium">{analysis.title}</h3>
                  </div>

                  {/* Hover CTA */}
                  <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <div className={`rounded-full p-[1px] animated-gradient-border bg-gradient-to-r ${analysis.gradient}`}>
                      <div className="px-4 py-2 md:px-5 rounded-full bg-white text-black text-xs md:text-base font-medium">
                        <span className="font-body">View — </span>
                        <span className="font-display italic">{analysis.title}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile button */}
        <div className="flex justify-center md:hidden mt-12">
          <ViewAllButton />
        </div>
      </div>
    </section>
  );
};

export default RecentAnalyses;
