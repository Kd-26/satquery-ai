"use client";

import { UploadCloud, File, AlertCircle } from "lucide-react";

export default function InputIntake() {
  return (
    <div className="border-2 border-dashed border-stroke rounded-xl p-8 bg-bg/50 hover:bg-white/5 transition-colors flex flex-col items-center justify-center text-center cursor-pointer group">
      <div className="w-16 h-16 rounded-full bg-stroke/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <UploadCloud className="w-8 h-8 text-muted group-hover:text-text-primary transition-colors" />
      </div>
      <h3 className="text-xl font-medium text-text-primary mb-2">
        Upload Imagery
      </h3>
      <p className="text-sm text-muted max-w-md mb-6">
        Drag and drop GeoTIFF, TIFF, JPEG, or PNG files here. Supported for optical and SAR scientific measurement.
      </p>
      
      <div className="flex gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-stroke text-xs text-muted">
          <File className="w-4 h-4" />
          <span>Max 5GB</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-stroke text-xs text-muted">
          <AlertCircle className="w-4 h-4" />
          <span>Multispectral Ready</span>
        </div>
      </div>
    </div>
  );
}
