"use client";

import Link from "next/link";
import { Satellite, Activity, Cpu, Radio, ArrowUpRight } from "lucide-react";

const QUICK_LINKS = [
  { label: "Analyze", href: "/analyze" },
  { label: "Projects", href: "/projects" },
  { label: "Results", href: "/insights" },
  { label: "Lab", href: "/lab" },
  { label: "Registry", href: "/registry" },
];

const HEALTH_NODES = [
  { label: "VLM API", ok: true },
  { label: "Tile Server", ok: true },
  { label: "NIM Inference", ok: true },
  { label: "Storage", ok: true },
];

const TELEMETRY = [
  { label: "Runs today", value: "142" },
  { label: "Avg latency", value: "2.3 s" },
  { label: "Models active", value: "5" },
  { label: "Data processed", value: "4.8 TB" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-black/30 backdrop-blur-sm mt-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-12 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand + attribution */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #89AACC 0%, #4E85BF 100%)" }}
              >
                <span className="text-[11px] font-display italic text-white">SQ</span>
              </div>
              <span className="font-medium text-text-primary">SatQuery AI</span>
            </div>
            <p className="text-xs text-muted leading-relaxed max-w-xs">
              Multi-modal satellite image analysis platform combining Vision-Language Models with physics-based remote sensing tools for scientific discovery.
            </p>
            <p className="text-[10px] text-muted/60 uppercase tracking-wider">
              Built for Smart India Hackathon {year} · ISRO Problem Statement
            </p>
          </div>

          {/* Quick links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted">Platform</h4>
            <ul className="space-y-2">
              {QUICK_LINKS.map(l => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-xs text-muted hover:text-text-primary transition-colors flex items-center gap-1 group"
                  >
                    {l.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* System health */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-green-400" />
              System Health
            </h4>
            <ul className="space-y-2">
              {HEALTH_NODES.map(n => (
                <li key={n.label} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${n.ok ? "bg-green-400" : "bg-red-400"}`} />
                  <span className="text-muted">{n.label}</span>
                  <span className={`ml-auto ${n.ok ? "text-green-400" : "text-red-400"}`}>{n.ok ? "Nominal" : "Degraded"}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Telemetry */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-sky-400" />
              Platform Telemetry
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {TELEMETRY.map(t => (
                <div key={t.label} className="bg-surface/50 border border-stroke rounded-xl p-3">
                  <p className="text-base font-display text-text-primary leading-none mb-1">{t.value}</p>
                  <p className="text-[10px] text-muted">{t.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] text-muted/60">
            <Radio className="w-3 h-3" />
            <span>Mission Control · All systems operational</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted/60">
            <Satellite className="w-3 h-3" />
            <span>© {year} SatQuery AI — SIH Team</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
