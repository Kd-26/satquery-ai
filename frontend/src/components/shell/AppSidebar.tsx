"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Search, 
  Map as MapIcon, 
  FolderKanban, 
  FlaskConical, 
  Box, 
  Settings,
  ChevronRight,
  Menu,
  X,
  Home
} from "lucide-react";
import { useSidebarStore } from "@/lib/sidebarStore";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: Home, isHome: true },
  { name: "New Analysis", href: "/analyze", icon: Search },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Scientific Lab", href: "/lab", icon: FlaskConical },
  { name: "Registry", href: "/registry", icon: Box },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <div 
      className={`fixed top-0 left-0 h-screen bg-surface border-r border-stroke z-40 transition-all duration-300 flex flex-col ${
        collapsed ? "md:w-16" : "md:w-64"
      } w-64 ${
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-stroke shrink-0">
        <button 
          onClick={toggleCollapsed}
          className="hidden md:flex p-1.5 hover:bg-white/5 rounded-lg text-muted hover:text-text-primary transition-colors mr-2 shrink-0 items-center justify-center"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
        <button 
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 hover:bg-white/5 rounded-lg text-muted hover:text-text-primary transition-colors mr-2 shrink-0 flex items-center justify-center"
          title="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
        
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#89AACC] to-[#4E85BF] flex items-center justify-center p-[1px]">
                  <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-display italic tracking-tighter text-text-primary">SQ</span>
                  </div>
                </div>
                <span className="font-display italic tracking-wide text-lg">SatQuery AI</span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Nav */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-xl transition-colors group relative ${
                isActive 
                  ? "bg-text-primary text-bg" 
                  : "text-muted hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${collapsed ? "mx-auto" : "mr-3"}`} />
              
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap text-sm font-medium"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-surface border border-stroke rounded-md text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Nav */}
      <div className="p-3 border-t border-stroke shrink-0">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center px-3 py-2.5 rounded-xl transition-colors group relative ${
            pathname === "/settings" 
              ? "bg-text-primary text-bg" 
              : "text-muted hover:bg-white/5 hover:text-text-primary"
          }`}
        >
          <Settings className={`w-4 h-4 shrink-0 ${collapsed ? "mx-auto" : "mr-3"}`} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap text-sm font-medium"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
          {collapsed && (
            <div className="absolute left-full ml-4 px-2 py-1 bg-surface border border-stroke rounded-md text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Settings
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
