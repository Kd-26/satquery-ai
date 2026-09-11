"use client";

import { useState } from "react";
import { Layers, Eye, EyeOff, GripVertical, Download, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LayerManager() {
  const [layers, setLayers] = useState([
    { id: "semantic", name: "Semantic Mask (Water)", visible: true, opacity: 100, locked: false },
    { id: "change", name: "Change Detection (Decrease)", visible: false, opacity: 80, locked: false },
    { id: "quality", name: "Quality Mask (Clouds/Shadows)", visible: true, opacity: 60, locked: true },
    { id: "source", name: "Source GeoTIFF (RGB)", visible: true, opacity: 100, locked: true },
  ]);
  const [collapsed, setCollapsed] = useState(false);

  const toggleVisibility = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const visibleCount = layers.filter(l => l.visible).length;

  return (
    <div className="absolute top-4 left-4 z-20 bg-surface/90 backdrop-blur-md border border-stroke rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
      style={{ width: collapsed ? "auto" : "16rem" }}
    >
      <div
        className="p-3 flex items-center gap-2 cursor-pointer select-none group"
        onClick={() => setCollapsed(c => !c)}
      >
        <Layers className="w-4 h-4 text-sky-400 shrink-0" />
        {!collapsed && (
          <h4 className="text-xs font-medium text-text-primary uppercase tracking-wider flex-1">Layer Stack</h4>
        )}
        {collapsed && (
          <span className="text-xs text-muted font-mono">{visibleCount}/{layers.length}</span>
        )}
        <button
          className="p-0.5 text-muted hover:text-text-primary transition-colors rounded"
          aria-label={collapsed ? "Expand layers" : "Collapse layers"}
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="layers"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden border-t border-stroke"
          >
            <div className="p-2 space-y-1">
              {layers.map(layer => (
                <div key={layer.id} className="group flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <button className="text-muted/50 cursor-grab active:cursor-grabbing hover:text-muted transition-colors">
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => toggleVisibility(layer.id)}
                    className={`p-1 rounded-md transition-colors ${layer.visible ? 'text-text-primary' : 'text-muted/50 hover:text-muted'}`}
                  >
                    {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <span className={`text-xs flex-1 truncate transition-colors ${layer.visible ? 'text-text-primary' : 'text-muted'}`}>
                    {layer.name}
                  </span>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {layer.locked ? (
                      <Lock className="w-3 h-3 text-muted/50" />
                    ) : (
                      <button className="p-1 text-muted hover:text-text-primary transition-colors" title="Export Layer">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
