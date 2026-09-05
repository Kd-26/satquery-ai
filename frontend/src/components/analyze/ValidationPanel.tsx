"use client";

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";

const CHECKS = [
  { id: "1", label: "Geospatial Identity", status: "pass", details: "CRS: EPSG:4326 verified." },
  { id: "2", label: "Optical Quality", status: "pass", details: "Cloud cover < 10% (Actual: 4.2%)." },
  { id: "3", label: "Sensor Calibration", status: "warn", details: "Minor radiometric calibration variance detected." },
  { id: "4", label: "Temporal Validation", status: "fail", details: "Missing acquisition date in metadata." },
];

export default function ValidationPanel() {
  return (
    <div className="bg-bg/50 border border-stroke rounded-xl overflow-hidden">
      <div className="p-4 border-b border-stroke flex items-center justify-between">
        <h4 className="font-medium text-text-primary">Image Validation Pipeline</h4>
        <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500 font-medium">
          Issues Detected
        </span>
      </div>

      <Accordion.Root type="single" collapsible className="w-full">
        {CHECKS.map((check) => (
          <Accordion.Item
            key={check.id}
            value={check.id}
            className="border-b border-stroke last:border-0"
          >
            <Accordion.Header className="flex">
              <Accordion.Trigger className="flex flex-1 items-center justify-between p-4 hover:bg-white/5 transition-colors [&[data-state=open]>svg]:rotate-180 text-left">
                <div className="flex items-center gap-3">
                  {check.status === "pass" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {check.status === "warn" && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                  {check.status === "fail" && <XCircle className="w-5 h-5 text-red-500" />}
                  <span className="text-sm font-medium text-text-primary">{check.label}</span>
                </div>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="px-12 pb-4 text-muted">
                {check.details}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}
