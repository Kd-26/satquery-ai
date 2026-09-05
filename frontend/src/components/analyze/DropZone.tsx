"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, File as FileIcon, X, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type UploadedFile = {
  file: File;
  preview?: string;
  progress: number;
  status: "uploading" | "done" | "error";
  metadata?: {
    type: "optical" | "sar" | "unknown";
    width: number;
    height: number;
    sizeMb: number;
    isGeoTiff: boolean;
  };
};

interface DropZoneProps {
  onFilesAccepted: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

export default function DropZone({ onFilesAccepted, maxFiles = 2 }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isTiff = file.name.toLowerCase().endsWith(".tif") || file.name.toLowerCase().endsWith(".tiff");
    const preview = isImage && !isTiff ? URL.createObjectURL(file) : undefined;

    const newFile: UploadedFile = {
      file,
      preview,
      progress: 0,
      status: "uploading",
      metadata: {
        type: file.name.toLowerCase().includes("sar") ? "sar" : "optical",
        width: 1024,
        height: 1024,
        sizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        isGeoTiff: isTiff,
      },
    };

    setFiles((prev) => [...prev, newFile]);

    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setFiles((prev) =>
        prev.map((f) =>
          f.file.name === file.name
            ? { ...f, progress: p, status: p >= 100 ? "done" : "uploading" }
            : f
        )
      );
      if (p >= 100) clearInterval(interval);
    }, 200);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files).slice(0, maxFiles - files.length);
        newFiles.forEach(processFile);
      }
    },
    [files.length, maxFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).slice(0, maxFiles - files.length);
      newFiles.forEach(processFile);
    }
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.file.name !== name));
  };

  const allDone = files.length > 0 && files.every((f) => f.status === "done");

  return (
    <div className="space-y-6">
      {files.length < maxFiles && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`group relative bg-surface border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
            dragging ? "border-sky-400 bg-sky-400/5" : "border-stroke hover:border-stroke/80 hover:bg-white/5"
          }`}
        >
          <input
            type="file"
            ref={inputRef}
            onChange={handleChange}
            className="hidden"
            multiple={maxFiles > 1}
            accept=".tif,.tiff,.jpg,.jpeg,.png"
          />

          <div className="w-16 h-16 rounded-full bg-stroke/40 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
            <UploadCloud className="w-8 h-8 text-muted group-hover:text-text-primary transition-colors" />
          </div>

          <p className="text-text-primary font-medium mb-2 text-lg">Drop imagery here</p>
          <p className="text-sm text-muted max-w-sm mb-6">
            Upload GeoTIFF, JPEG, or PNG. Supports single image or bi-temporal pairs.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg border border-stroke text-xs text-muted">
              <FileIcon className="w-3.5 h-3.5" /> Max 5 GB
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg border border-stroke text-xs text-muted">
              Multispectral Ready
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg border border-stroke text-xs text-muted">
              Optical + SAR
            </span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {files.map((f) => (
              <motion.div
                key={f.file.name}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-stroke rounded-2xl p-4 flex gap-4 relative overflow-hidden"
              >
                {f.status === "uploading" && (
                  <div
                    className="absolute inset-0 bg-sky-500/5 transition-all duration-300"
                    style={{ width: `${f.progress}%` }}
                  />
                )}

                <div className="w-16 h-16 rounded-xl bg-bg border border-stroke flex items-center justify-center overflow-hidden shrink-0 relative z-10">
                  {f.preview ? (
                    <img src={f.preview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted" />
                  )}
                  {f.status === "done" && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-bg rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-text-primary truncate pr-4" title={f.file.name}>
                      {f.file.name}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(f.file.name); }}
                      className="p-1 hover:bg-white/10 rounded-md text-muted transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted mb-2">
                    <span className="uppercase tracking-wider">{f.metadata?.sizeMb} MB</span>
                    <span className="w-1 h-1 rounded-full bg-stroke" />
                    {f.metadata?.isGeoTiff ? (
                      <span className="text-sky-400">GeoTIFF</span>
                    ) : (
                      <span className="text-yellow-400">Limited Evidence</span>
                    )}
                  </div>

                  {f.status === "uploading" && (
                    <div className="w-full h-1 bg-bg rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${f.progress}%` }} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <button
              onClick={() => onFilesAccepted(files)}
              className="relative rounded-full text-sm transition-transform duration-200 hover:scale-105"
            >
              <span className="absolute rounded-full accent-gradient" style={{ inset: "-2px" }} />
              <span className="relative z-10 block px-6 py-2.5 rounded-full bg-bg text-text-primary font-medium">
                Proceed to Inspection
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
