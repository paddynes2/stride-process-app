"use client";

import * as React from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import dynamic from "next/dynamic";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateToolSection, deleteToolSection as apiDeleteToolSection } from "@/lib/api/client";
import type { ToolSection } from "@/types/database";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((mod) => ({ default: mod.RichTextEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] animate-pulse" />
    ),
  }
);

interface ToolSectionDetailPanelProps {
  toolSection: ToolSection;
  toolCount?: number;
  onUpdate: (toolSection: ToolSection) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ToolSectionDetailPanel({ toolSection, toolCount = 0, onUpdate, onDelete, onClose }: ToolSectionDetailPanelProps) {
  const [name, setName] = React.useState(toolSection.name);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const nameTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    setName(toolSection.name);
  }, [toolSection.id, toolSection.name]);

  const handleFieldUpdate = async (field: string, value: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await updateToolSection(toolSection.id, { [field]: value } as any);
      onUpdate(updated);
    } catch (err) {
      toastError(`Failed to update ${field}`, { error: err, retry: () => handleFieldUpdate(field, value) });
    }
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    clearTimeout(nameTimeoutRef.current);
    nameTimeoutRef.current = setTimeout(() => {
      if (newName.trim()) handleFieldUpdate("name", newName.trim());
    }, 500);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDeleteToolSection(toolSection.id);
      onDelete(toolSection.id);
      toast.success("Tool section deleted");
    } catch (err) {
      toastError("Failed to delete tool section", { error: err });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Section Details
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-5">
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Name
          </label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Section name" />
          <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
            {toolCount} {toolCount === 1 ? "tool" : "tools"} in this section
          </p>
        </div>

        <Separator />

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Description
          </label>
          <RichTextEditor
            content={toolSection.description ?? ""}
            onChange={(html) => handleFieldUpdate("description", html)}
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="w-full">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Section
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogPrimitive.Title className="text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
              Delete Tool Section
            </DialogPrimitive.Title>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{toolSection.name}&rdquo;? Tools inside will remain but lose their grouping.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
