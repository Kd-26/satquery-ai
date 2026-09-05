"use client";

import { useMode } from "@/contexts/ModeContext";
import { motion } from "framer-motion";
import { ShieldAlert, Bell, User } from "lucide-react";

export default function Topbar() {
  const { mode, toggleMode } = useMode();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 ml-0 md:ml-64 border-b border-stroke bg-bg/80 backdrop-blur z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {/* Breadcrumb or run status could go here */}
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted bg-stroke/30 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Ready for Analysis
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Mode Switcher */}
        <button
          onClick={toggleMode}
          className="relative flex items-center bg-stroke/30 rounded-full p-1 w-32 h-8"
        >
          <motion.div
            className="absolute bg-text-primary rounded-full w-[46%] h-6 shadow-sm"
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            initial={false}
            animate={{
              x: mode === "simple" ? "4%" : "106%",
            }}
          />
          <span
            className={`relative z-10 flex-1 text-xs font-medium text-center transition-colors ${
              mode === "simple" ? "text-bg" : "text-muted"
            }`}
          >
            Simple
          </span>
          <span
            className={`relative z-10 flex-1 text-xs font-medium text-center transition-colors ${
              mode === "scientific" ? "text-bg" : "text-muted"
            }`}
          >
            Scientific
          </span>
        </button>

        <div className="w-px h-6 bg-stroke" />

        {/* Action Icons */}
        <div className="flex items-center gap-4 text-muted">
          <button className="hover:text-text-primary transition-colors relative group flex items-center">
            <ShieldAlert className="w-5 h-5" />
            <div className="absolute top-full right-0 mt-2 w-48 bg-stroke/50 backdrop-blur border border-stroke rounded-lg p-2 text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              Data sensitivity: Unclassified
            </div>
          </button>
          <button className="hover:text-text-primary transition-colors flex items-center">
            <Bell className="w-5 h-5" />
          </button>
          <button className="hover:text-text-primary transition-colors bg-white/5 p-1.5 rounded-full flex items-center">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
