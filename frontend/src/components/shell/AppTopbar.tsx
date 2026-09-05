"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Activity, Bell, User } from "lucide-react";
import { useState } from "react";
import JobCentre from "./JobCentre";
import { useMode } from "@/contexts/ModeContext";

export default function AppTopbar() {
  const pathname = usePathname();
  const [jobCentreOpen, setJobCentreOpen] = useState(false);
  const { mode, setMode } = useMode();

  // Generate breadcrumb from pathname
  const paths = pathname?.split("/").filter(Boolean) || [];

  return (
    <>
      <div className="h-16 border-b border-stroke bg-bg/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm">
          <span className="text-muted">App</span>
          {paths.map((p) => (
            <div key={p} className="flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-muted/50 mx-2" />
              <span className="text-text-primary capitalize">{p}</span>
            </div>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {/* Mode Toggle — wired to global ModeContext */}
          <div className="flex items-center bg-surface border border-stroke rounded-full p-0.5">
            <button
              onClick={() => setMode("simple")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                mode === "simple" ? "bg-text-primary text-bg" : "text-muted hover:text-text-primary"
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => setMode("scientific")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                mode === "scientific" ? "bg-text-primary text-bg" : "text-muted hover:text-text-primary"
              }`}
            >
              Scientific
            </button>
          </div>

          <div className="w-px h-5 bg-stroke" />

          {/* Jobs & Notifications */}
          <button
            onClick={() => setJobCentreOpen(true)}
            className="relative p-2 text-muted hover:text-text-primary transition-colors rounded-full hover:bg-white/5"
          >
            <Activity className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          </button>

          <button className="p-2 text-muted hover:text-text-primary transition-colors rounded-full hover:bg-white/5">
            <Bell className="w-4 h-4" />
          </button>

          {/* User Profile */}
          <div className="w-8 h-8 rounded-full bg-surface border border-stroke flex items-center justify-center overflow-hidden cursor-pointer hover:border-text-primary/50 transition-colors ml-2">
            <User className="w-4 h-4 text-muted" />
          </div>
        </div>
      </div>

      <JobCentre isOpen={jobCentreOpen} onClose={() => setJobCentreOpen(false)} />
    </>
  );
}
