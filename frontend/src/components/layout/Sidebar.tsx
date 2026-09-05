"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Settings,
  Database,
  LineChart,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Analysis", href: "/analyze", icon: Search },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Scientific Lab", href: "/lab", icon: LineChart },
  { name: "Models & Tools", href: "/registry", icon: Database },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 border-r border-stroke bg-bg/95 backdrop-blur z-40 hidden md:flex flex-col">
      <div className="p-6 border-b border-stroke h-16 flex items-center">
        <span className="font-display italic font-bold tracking-tight text-xl text-text-primary">
          SatQuery AI
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const isHome = item.href === "/";
          const actuallyActive = isHome ? pathname === "/" : isActive;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 group ${
                actuallyActive
                  ? "text-text-primary bg-white/5"
                  : "text-muted hover:text-text-primary hover:bg-white/5"
              }`}
            >
              {actuallyActive && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-text-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-stroke">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 text-xs text-muted">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>System Healthy</span>
        </div>
      </div>
    </aside>
  );
}
