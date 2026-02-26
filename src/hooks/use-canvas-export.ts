import * as React from "react";
import { fetchStepRolesBatch } from "@/lib/api/client";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";
import type { Section, Step, Connection } from "@/types/database";

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
    async (canvasElement: HTMLElement) => {
      try {
        const [{ exportWorkspacePdf }, stepIds] = await Promise.all([
          import("@/lib/export/pdf"),
          Promise.resolve(steps.map((s) => s.id)),
        ]);
        const stepRoles = stepIds.length > 0 ? await fetchStepRolesBatch(stepIds) : [];
        await exportWorkspacePdf({
          workspaceName,
          sections,
          steps,
          connections,
          canvasElement,
          stepRoles,
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
