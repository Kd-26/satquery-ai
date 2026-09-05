"use client";

import { motion } from "framer-motion";
import { Info, Map as MapIcon, Database, Calendar, Tag, ShieldCheck } from "lucide-react";
import type { UploadedFile } from "./DropZone";

interface MetadataCardsProps {
  files: UploadedFile[];
}

export default function MetadataCards({ files }: MetadataCardsProps) {
  // If no files, render empty state (shouldn't happen in flow, but for safety)
  if (!files || files.length === 0) return null;

  // Render metadata for the first file (expand later for multi-file comparison)
  const file = files[0];
  const meta = file.metadata;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary">Source Evidence</h3>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-1 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Embedded
          </span>
          <span className="flex items-center gap-1 text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Inferred
          </span>
          <span className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> Missing
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Format & Dimensions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-surface border border-stroke rounded-2xl p-4 flex flex-col"
        >
          <div className="flex items-center gap-2 text-muted mb-3">
            <Database className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Format</span>
          </div>
          <div className="flex items-end justify-between mt-auto">
            <div>
              <p className="text-text-primary font-medium">{meta?.isGeoTiff ? "GeoTIFF" : file.file.type || "JPEG/PNG"}</p>
              <p className="text-xs text-muted mt-1">{meta?.width} × {meta?.height} px</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400" title="Embedded" />
          </div>
        </motion.div>

        {/* Spatial Reference */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-surface border border-stroke rounded-2xl p-4 flex flex-col"
        >
          <div className="flex items-center gap-2 text-muted mb-3">
            <MapIcon className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Geospatial</span>
          </div>
          <div className="flex items-end justify-between mt-auto">
            <div>
              <p className="text-text-primary font-medium">{meta?.isGeoTiff ? "EPSG:4326" : "Unknown CRS"}</p>
              <p className="text-xs text-muted mt-1">{meta?.isGeoTiff ? "~10m GSD" : "No geographic bounds"}</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${meta?.isGeoTiff ? "bg-green-400" : "bg-yellow-400"}`} />
          </div>
        </motion.div>

        {/* Temporal */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-surface border border-stroke rounded-2xl p-4 flex flex-col"
        >
          <div className="flex items-center gap-2 text-muted mb-3">
            <Calendar className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Acquisition</span>
          </div>
          <div className="flex items-end justify-between mt-auto">
            <div>
              <p className="text-text-primary font-medium">
                {new Date(file.file.lastModified).toISOString().split('T')[0]}
              </p>
              <p className="text-xs text-muted mt-1">From file system</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-sky-400" title="Inferred" />
          </div>
        </motion.div>

        {/* Sensor & Bands */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-surface border border-stroke rounded-2xl p-4 flex flex-col"
        >
          <div className="flex items-center gap-2 text-muted mb-3">
            <Tag className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Sensor Payload</span>
          </div>
          <div className="flex items-end justify-between mt-auto">
            <div>
              <p className="text-text-primary font-medium">{meta?.type === "sar" ? "SAR (VV/VH)" : "Optical Multispectral"}</p>
              <p className="text-xs text-muted mt-1">{meta?.isGeoTiff ? "4 bands detected" : "3 bands (RGB)"}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-sky-400" />
          </div>
        </motion.div>
      </div>
      
      {!meta?.isGeoTiff && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 mt-4">
          <Info className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-yellow-400">Limited Evidence Mode</h4>
            <p className="text-xs text-yellow-400/80 mt-1 leading-relaxed">
              You uploaded a standard image without geographic metadata. Measurements (area, distance) and spectral indices (NDVI) are disabled. The system will rely purely on visual question answering (VQA) and standard segmentation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
