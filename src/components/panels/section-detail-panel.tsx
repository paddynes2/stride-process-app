"use client";

import * as React from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "./rich-text-editor";
import { updateSection, deleteSection as apiDeleteSection } from "@/lib/api/client";
import type { Section, Step } from "@/types/database";
import { toast } from "sonner";

interface SectionDetailPanelProps {
  section: Section;
  steps: Step[];
  onUpdate: (section: Section) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function SectionDetailPanel({ section, steps, onUpdate, onDelete, onClose }: SectionDetailPanelProps) {
  const [name, setName] = React.useState(section.name);
  const nameTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    setName(section.name);
  }, [section.id, section.name]);

  const handleFieldUpdate = async (field: string, value: unknown) => {
    try {
      const updated = await updateSection(section.id, { [field]: value });
      onUpdate(updated);
    } catch {
      toast.error(`Failed to update ${field}`);
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
    try {
      await apiDeleteSection(section.id);
      onDelete(section.id);
      toast.success("Section deleted");
    } catch {
      toast.error("Failed to delete section");
    }
  };

  // Status distribution
  const statusCounts = steps.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Section Details
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Name
          </label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Section name" />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Summary
          </label>
          <Textarea
            value={section.summary ?? ""}
            onChange={(e) => handleFieldUpdate("summary", e.target.value || null)}
            placeholder="Brief description of this section..."
            rows={3}
          />
        </div>

        <Separator />

        {/* Steps overview */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-2">
            Steps ({steps.length})
          </label>
          {steps.length === 0 ? (
            <p className="text-[11px] text-[var(--text-quaternary)]">No steps in this section</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant={status as "draft" | "in_progress" | "testing" | "live" | "archived"}>
                  {status.replace("_", " ")}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Notes
          </label>
          <RichTextEditor
            content={section.notes ?? ""}
            onChange={(html) => handleFieldUpdate("notes", html)}
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
        <Button variant="destructive" size="sm" onClick={handleDelete} className="w-full">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Section
        </Button>
      </div>
    </div>
  );
}
