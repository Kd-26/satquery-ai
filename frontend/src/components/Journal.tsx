"use client";

import { motion } from "framer-motion";

const insights = [
  {
    title: "Interpreting SAR Backscatter for Flood Detection",
    tag: "SAR ┬╖ Tutorial",
    readTime: "6 min read",
    date: "Sep 01, 2026",
    gradient: "from-sky-600/30 to-blue-900/10",
  },
  {
    title: "NDVI Thresholds for Agricultural Health Monitoring",
    tag: "Optical ┬╖ Research",
    readTime: "5 min read",
    date: "Aug 24, 2026",
    gradient: "from-emerald-600/30 to-green-900/10",
  },
  {
    title: "Temporal Analysis: Change Detection Best Practices",
    tag: "Multitemporal ┬╖ Guide",
    readTime: "7 min read",
    date: "Aug 17, 2026",
    gradient: "from-violet-600/30 to-indigo-900/10",
  },
  {
    title: "Understanding CRS & Georeferencing in GeoTIFF",
    tag: "Fundamentals ┬╖ Explainer",
    readTime: "5 min read",
    date: "Aug 10, 2026",
    gradient: "from-amber-600/30 to-orange-900/10",
  },
];

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const ArrowNE = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor">
    <path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z" />
  </svg>
);

const ViewAllButton = () => (
  <button className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-stroke rounded-full text-sm text-muted hover:text-text-primary transition-colors duration-300">
    <span className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-[#89AACC] to-[#4E85BF] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ margin: "-1px" }}>
      <span className="block w-full h-full rounded-full bg-surface" />
    </span>
    <span className="relative z-10">View all</span>
    <svg className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" viewBox="0 0 256 256" fill="currentColor">
      <path d="M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A8,8,0,0,1,204,64Z" />
    </svg>
  </button>
);

const IntelReports = () => {
  return (
    <section id="reports" className="relative bg-bg py-16 md:py-24 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16 px-2"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Intel Reports</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-text-primary leading-[1.1]">
              Remote sensing{" "}
              <span className="font-display italic">insights</span>
            </h2>
            <p className="text-muted text-sm md:text-base mt-3 max-w-md">
              Guides, tutorials, and research notes from the SatQuery AI team.
            </p>
          </div>
          <ViewAllButton />
        </motion.div>

        {/* Entries */}
        <div className="flex flex-col gap-4">
          {insights.map((entry, i) => (
            <motion.a
              key={entry.title}
              href="#"
              className="group flex flex-col sm:flex-row items-center gap-6 p-4 bg-surface/30 hover:bg-surface border border-stroke rounded-[40px] sm:rounded-full transition-all duration-500 ease-out hover:scale-[1.005] hover:shadow-xl hover:shadow-black/5"
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: i * 0.1, ease }}
              viewport={{ once: true, margin: "-50px" }}
            >
              {/* Gradient badge */}
              <div className={`relative w-24 h-24 sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden shrink-0 border-2 border-transparent group-hover:border-stroke transition-all duration-500 bg-gradient-to-br ${entry.gradient} flex items-center justify-center`}>
                <span className="text-xs text-muted/60 uppercase tracking-wider font-medium text-center px-2 leading-tight">{entry.tag.split(" ┬╖ ")[0]}</span>
              </div>

              {/* Content */}
              <div className="flex flex-col md:flex-row items-center gap-4 w-full px-4 sm:px-2">
                <h3 className="text-lg md:text-2xl text-text-primary font-medium group-hover:translate-x-1 transition-transform duration-300 line-clamp-1 max-w-[600px] text-center sm:text-left">
                  {entry.title}
                </h3>
                <div className="hidden lg:block flex-grow h-px bg-stroke/30 group-hover:bg-stroke/60 transition-colors duration-500" />
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs sm:text-sm text-muted font-medium">{entry.readTime}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-stroke group-hover:bg-[#4E85BF] transition-colors duration-500" />
                  <span className="text-xs sm:text-sm text-muted">{entry.date}</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="w-10 h-10 rounded-full border border-stroke flex items-center justify-center text-text-primary/50 group-hover:bg-text-primary group-hover:text-bg group-hover:border-text-primary transition-all duration-300 shrink-0 ml-4">
                <span className="group-hover:scale-110 transition-transform duration-300 inline-flex">
                  <ArrowNE />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntelReports;
