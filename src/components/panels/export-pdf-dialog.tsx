"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
// NOTE (BUG-023): Use DialogPrimitive.Title directly — custom DialogTitle wraps <h2>,
// not DialogPrimitive.Title, so Radix can't register it for a11y.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ExportConfig {
  canvasSnapshot: boolean;
  dataTable: boolean;
  gapAnalysis: boolean;
  costAnalysis: boolean;
  executiveSummary: boolean;
  journeyMap: boolean;
  journeySentiment: boolean;
  perspectiveComparison: boolean;
  prioritizationMatrix: boolean;
  toolLandscape: boolean;
  improvements: boolean;
  aiInsights: boolean;
}

const EXECUTIVE_SUMMARY_CONFIG: ExportConfig = {
  canvasSnapshot: true,
  dataTable: false,
  gapAnalysis: true,
  costAnalysis: false,
  executiveSummary: true,
  journeyMap: false,
  journeySentiment: false,
  perspectiveComparison: false,
  prioritizationMatrix: false,
  toolLandscape: false,
  improvements: false,
  aiInsights: false,
};

const FULL_AUDIT_CONFIG: ExportConfig = {
  canvasSnapshot: true,
  dataTable: true,
  gapAnalysis: true,
  costAnalysis: true,
  executiveSummary: true,
  journeyMap: true,
  journeySentiment: true,
  perspectiveComparison: true,
  prioritizationMatrix: true,
  toolLandscape: true,
  improvements: true,
  aiInsights: true,
};

const GAP_REPORT_CONFIG: ExportConfig = {
  canvasSnapshot: true,
  dataTable: false,
  gapAnalysis: true,
  costAnalysis: false,
  executiveSummary: false,
  journeyMap: false,
  journeySentiment: false,
  perspectiveComparison: true,
  prioritizationMatrix: false,
  toolLandscape: false,
  improvements: true,
  aiInsights: false,
};

interface SectionDef {
  key: keyof ExportConfig;
  label: string;
  available: boolean;
}

const SECTION_GROUPS: { group: string; sections: SectionDef[] }[] = [
  {
    group: "Canvas",
    sections: [
      { key: "canvasSnapshot", label: "Canvas Snapshot", available: true },
    ],
  },
  {
    group: "Process Data",
    sections: [
      { key: "dataTable", label: "Data Table", available: true },
      { key: "gapAnalysis", label: "Gap Analysis", available: true },
      { key: "costAnalysis", label: "Cost Analysis", available: true },
    ],
  },
  {
    group: "Insights",
    sections: [
      { key: "executiveSummary", label: "Executive Summary", available: true },
      { key: "improvements", label: "Improvements", available: false },
      { key: "aiInsights", label: "AI Insights", available: false },
    ],
  },
  {
    group: "Journey & Perspectives",
    sections: [
      { key: "journeyMap", label: "Journey Map", available: true },
      { key: "journeySentiment", label: "Journey Sentiment", available: true },
      { key: "perspectiveComparison", label: "Perspective Comparison", available: true },
      { key: "prioritizationMatrix", label: "Prioritization Matrix", available: false },
      { key: "toolLandscape", label: "Tool Landscape", available: false },
    ],
  },
];

type Preset = "executive" | "full" | "gap" | "custom";

interface ExportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: ExportConfig) => void;
  exporting?: boolean;
}

export function ExportPdfDialog({
  open,
  onOpenChange,
  onExport,
  exporting = false,
}: ExportPdfDialogProps) {
  const [config, setConfig] = React.useState<ExportConfig>(FULL_AUDIT_CONFIG);
  const [activePreset, setActivePreset] = React.useState<Preset>("full");

  const handlePreset = (preset: Preset) => {
    setActivePreset(preset);
    if (preset === "full") {
      setConfig(FULL_AUDIT_CONFIG);
    } else if (preset === "executive") {
      setConfig(EXECUTIVE_SUMMARY_CONFIG);
    } else if (preset === "gap") {
      setConfig(GAP_REPORT_CONFIG);
    }
  };

  const handleToggle = (key: keyof ExportConfig, available: boolean) => {
    if (!available) return;
    setActivePreset("custom");
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCount = (Object.keys(config) as (keyof ExportConfig)[]).filter(
    (k) => config[k]
  ).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!exporting) onOpenChange(o); }}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogPrimitive.Title className="text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
            Export PDF
          </DialogPrimitive.Title>
          <DialogDescription>
            Choose which sections to include in your PDF report
          </DialogDescription>
        </DialogHeader>

        {/* Preset buttons */}
        <div>
          <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
            Preset
          </p>
          <div className="flex gap-2">
            {(
              [
                { id: "executive", label: "Executive Summary" },
                { id: "full", label: "Full Audit" },
                { id: "gap", label: "Gap Report" },
              ] as { id: Preset; label: string }[]
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handlePreset(id)}
                className={cn(
                  "px-3 py-1.5 rounded-[var(--radius-md)] border text-[12px] font-medium transition-colors",
                  activePreset === id
                    ? "bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white"
                    : "bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Section checkboxes */}
        <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
          {SECTION_GROUPS.map(({ group, sections }) => (
            <div key={group}>
              <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">
                {group}
              </p>
              <div className="space-y-0.5">
                {sections.map(({ key, label, available }) => (
                  <label
                    key={key}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)]",
                      available
                        ? "cursor-pointer hover:bg-[var(--bg-surface-secondary)]"
                        : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={config[key]}
                      onChange={() => handleToggle(key, available)}
                      disabled={!available}
                      className="w-3.5 h-3.5 accent-[var(--accent-blue)] shrink-0"
                    />
                    <span className="text-[13px] text-[var(--text-primary)] flex-1">
                      {label}
                    </span>
                    {!available && (
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        coming soon
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onExport(config)}
            disabled={exporting || selectedCount === 0}
          >
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
