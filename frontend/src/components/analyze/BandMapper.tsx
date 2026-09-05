"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, ChevronDown } from "lucide-react";
import type { UploadedFile } from "./DropZone";

export default function BandMapper({ file }: { file: UploadedFile }) {
  const isOptical = file.metadata?.type === "optical";
  const numBands = file.metadata?.isGeoTiff ? 4 : 3;

  const [mappings, setMappings] = useState(
    Array.from({ length: numBands }).map((_, i) => ({
      channel: i + 1,
      name: isOptical ? (i === 0 ? "Red" : i === 1 ? "Green" : i === 2 ? "Blue" : "NIR") : (i === 0 ? "VV" : "VH"),
      wl: isOptical ? (i === 0 ? "0.66 µm" : i === 1 ? "0.56 µm" : i === 2 ? "0.49 µm" : "0.84 µm") : "C-Band",
    }))
  );

  return (
    <div className="bg-surface border border-stroke rounded-2xl overflow-hidden mt-6">
      <div className="p-4 border-b border-stroke flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-primary">
          <Layers className="w-4 h-4 text-sky-400" />
          <h4 className="text-sm font-medium">Spectral Band Mapping</h4>
        </div>
        <span className="text-xs text-muted">Auto-inferred</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Assigned Band</th>
              <th className="px-4 py-3 font-medium">Wavelength / Pol</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {mappings.map((m, i) => (
              <tr key={m.channel} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-muted">Band {m.channel}</td>
                <td className="px-4 py-3 text-text-primary font-medium flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.name === 'Red' ? 'bg-red-400' : m.name === 'Green' ? 'bg-green-400' : m.name === 'Blue' ? 'bg-blue-400' : m.name === 'NIR' ? 'bg-purple-400' : 'bg-sky-400'}`} />
                  {m.name}
                </td>
                <td className="px-4 py-3 text-muted">{m.wl}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-sky-400 hover:text-sky-300 text-xs font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
