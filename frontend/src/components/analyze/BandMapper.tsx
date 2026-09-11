"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, ChevronDown } from "lucide-react";
import type { UploadedFile } from "./DropZone";

const OPTICAL_BANDS = [
  { name: "Red",     wl: "0.66 µm", color: "bg-red-400" },
  { name: "Green",   wl: "0.56 µm", color: "bg-green-400" },
  { name: "Blue",    wl: "0.49 µm", color: "bg-blue-400" },
  { name: "NIR",     wl: "0.84 µm", color: "bg-purple-400" },
  { name: "SWIR-1",  wl: "1.61 µm", color: "bg-amber-400" },
  { name: "SWIR-2",  wl: "2.19 µm", color: "bg-orange-400" },
  { name: "RedEdge", wl: "0.70 µm", color: "bg-emerald-400" },
];

const SAR_BANDS = [
  { name: "VV",  wl: "C-Band (Co-pol)",   color: "bg-sky-400" },
  { name: "VH",  wl: "C-Band (Cross-pol)",color: "bg-cyan-400" },
  { name: "HH",  wl: "L/C-Band Co-pol",   color: "bg-blue-400" },
  { name: "HV",  wl: "L/C-Band Cross-pol",color: "bg-indigo-400" },
  { name: "RVI", wl: "Radar Veg Index",   color: "bg-teal-400" },
];

export default function BandMapper({ file }: { file: UploadedFile }) {
  const isOptical = file.metadata?.type === "optical";
  const numBands = file.metadata?.isGeoTiff ? 4 : 3;
  const availableBands = isOptical ? OPTICAL_BANDS : SAR_BANDS;

  const [editingChannel, setEditingChannel] = useState<number | null>(null);

  const [mappings, setMappings] = useState(
    Array.from({ length: numBands }).map((_, i) => ({
      channel: i + 1,
      name: isOptical ? (i === 0 ? "Red" : i === 1 ? "Green" : i === 2 ? "Blue" : "NIR") : (i === 0 ? "VV" : "VH"),
      wl: isOptical ? (i === 0 ? "0.66 µm" : i === 1 ? "0.56 µm" : i === 2 ? "0.49 µm" : "0.84 µm") : (i === 0 ? "C-Band (Co-pol)" : "C-Band (Cross-pol)"),
      color: isOptical ? (i === 0 ? "bg-red-400" : i === 1 ? "bg-green-400" : i === 2 ? "bg-blue-400" : "bg-purple-400") : "bg-sky-400",
    }))
  );

  const handleSelectBand = (channel: number, bandName: string) => {
    const bandInfo = availableBands.find((b) => b.name === bandName);
    if (!bandInfo) return;
    setMappings((prev) =>
      prev.map((m) =>
        m.channel === channel
          ? { ...m, name: bandInfo.name, wl: bandInfo.wl, color: bandInfo.color }
          : m
      )
    );
    setEditingChannel(null);
  };

  return (
    <div className="bg-surface border border-stroke rounded-2xl overflow-hidden mt-6">
      <div className="p-4 border-b border-stroke flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-primary">
          <Layers className="w-4 h-4 text-sky-400" />
          <h4 className="text-sm font-medium">Spectral Band Mapping</h4>
        </div>
        <span className="text-xs text-muted">Auto-inferred · Click Edit to reassign</span>
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
            {mappings.map((m) => (
              <tr key={m.channel} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-muted">Band {m.channel}</td>
                <td className="px-4 py-3 text-text-primary font-medium">
                  {editingChannel === m.channel ? (
                    <select
                      value={m.name}
                      autoFocus
                      onChange={(e) => handleSelectBand(m.channel, e.target.value)}
                      onBlur={() => setEditingChannel(null)}
                      className="bg-bg border border-sky-500/50 rounded-lg px-2.5 py-1 text-xs text-text-primary outline-none cursor-pointer"
                    >
                      {availableBands.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name} ({b.wl})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${m.color}`} />
                      <span>{m.name}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted text-xs">{m.wl}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditingChannel(editingChannel === m.channel ? null : m.channel)}
                    className="text-sky-400 hover:text-sky-300 text-xs font-medium px-2 py-1 rounded hover:bg-sky-500/10 transition-colors"
                  >
                    {editingChannel === m.channel ? "Done" : "Edit"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
