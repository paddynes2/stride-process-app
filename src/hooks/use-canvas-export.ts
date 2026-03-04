import * as React from "react";
import { fetchStepRolesBatch } from "@/lib/api/client";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";
import type { Section, Step, Connection } from "@/types/database";
import type { ExportConfig } from "@/components/panels/export-pdf-dialog";

interface UseCanvasExportOptions {
  workspaceName: string;
  sections: Section[];
  steps: Step[];
  connections: Connection[];
}

export function useCanvasExport({
  workspaceName,
  sections,
  steps,
  connections,
}: UseCanvasExportOptions) {
  const handleExportPdf = React.useCallback(
    async (canvasElement: HTMLElement, config?: ExportConfig) => {
      try {
        const { exportWorkspacePdf } = await import("@/lib/export/pdf");

        const stepIds = steps.map((s) => s.id);

        // Skip step-roles fetch if cost analysis is disabled — saves an API call
        const shouldFetchRoles = !config || config.costAnalysis;
        const stepRoles =
          shouldFetchRoles && stepIds.length > 0
            ? await fetchStepRolesBatch(stepIds)
            : [];

        // Apply section filters. pdf.ts uses a single `steps` array for all three
        // data sections (data table, gap analysis, cost summary). We mask fields to
        // suppress individual sections without modifying the read-only pdf.ts.
        let exportSteps = steps;
        let exportStepRoles = stepRoles;

        if (config) {
          // If all three data sections are off, pass empty array to skip all
          if (!config.dataTable && !config.gapAnalysis && !config.costAnalysis) {
            exportSteps = [];
          } else {
            // Zero out maturity fields to suppress gap analysis page
            if (!config.gapAnalysis) {
              exportSteps = exportSteps.map((s) => ({
                ...s,
                maturity_score: null,
                target_maturity: null,
              }));
            }
            // Zero out time/frequency fields and empty roles to suppress cost page
            if (!config.costAnalysis) {
              exportStepRoles = [];
              exportSteps = exportSteps.map((s) => ({
                ...s,
                time_minutes: null,
                frequency_per_month: null,
              }));
            }
          }
        }

        await exportWorkspacePdf({
          workspaceName,
          sections,
          steps: exportSteps,
          connections,
          canvasElement,
          stepRoles: exportStepRoles,
        });
        toast.success("PDF exported successfully");
      } catch (err) {
        toastError("Failed to export PDF", { error: err });
      }
    },
    [workspaceName, sections, steps, connections]
  );

  const handleExportPng = React.useCallback(
    async (canvasElement: HTMLElement) => {
      try {
        const { exportCanvasPng } = await import("@/lib/export/png");
        await exportCanvasPng({
          canvasElement,
          workspaceName,
        });
        toast.success("PNG exported successfully");
      } catch (err) {
        toastError("Failed to export PNG", { error: err });
      }
    },
    [workspaceName]
  );

  return { handleExportPdf, handleExportPng };
}
