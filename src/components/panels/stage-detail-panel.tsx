"use client";

import * as React from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((mod) => ({ default: mod.RichTextEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] animate-pulse" />
    ),
  }
);
import { updateStage, deleteStage as apiDeleteStage } from "@/lib/api/client";
import type { Stage, Touchpoint } from "@/types/database";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";

const CHANNEL_OPTIONS = [
  { value: "", label: "None" },
  { value: "web", label: "Web" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "in-person", label: "In-Person" },
  { value: "other", label: "Other" },
] as const;

interface StageDetailPanelProps {
  stage: Stage;
  touchpoints: Touchpoint[];
  onUpdate: (stage: Stage) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function StageDetailPanel({ stage, touchpoints, onUpdate, onDelete, onClose }: StageDetailPanelProps) {
  const [name, setName] = React.useState(stage.name);
  const [owner, setOwner] = React.useState(stage.owner ?? "");
  const nameTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const ownerTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    setName(stage.name);
    setOwner(stage.owner ?? "");
  }, [stage.id, stage.name, stage.owner]);

  const handleFieldUpdate = async (field: string, value: unknown) => {
    try {
      const updated = await updateStage(stage.id, { [field]: value });
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

  const handleOwnerChange = (newOwner: string) => {
    setOwner(newOwner);
    clearTimeout(ownerTimeoutRef.current);
    ownerTimeoutRef.current = setTimeout(() => {
      handleFieldUpdate("owner", newOwner.trim() || null);
    }, 500);
  };

  const handleDelete = async () => {
    try {
      await apiDeleteStage(stage.id);
      onDelete(stage.id);
      toast.success("Stage deleted");
    } catch (err) {
      toastError("Failed to delete stage", { error: err });
    }
  };

  // Touchpoint summary
  const sentimentCounts = touchpoints.reduce(
    (acc, tp) => {
      const s = tp.sentiment ?? "neutral";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Stage Details
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Name
          </label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Stage name" />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Channel
          </label>
          <select
            value={stage.channel ?? ""}
            onChange={(e) => handleFieldUpdate("channel", e.target.value || null)}
            aria-label="Stage channel"
            className="w-full h-8 px-3 text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--signal)]"
          >
            {CHANNEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Owner
          </label>
          <Input value={owner} onChange={(e) => handleOwnerChange(e.target.value)} placeholder="Who owns this stage?" />
        </div>

        <Separator />

        {/* Touchpoint overview */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-2">
            Touchpoints ({touchpoints.length})
          </label>
          {touchpoints.length === 0 ? (
            <p className="text-[11px] text-[var(--text-quaternary)]">No touchpoints in this stage</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(sentimentCounts).map(([sentiment, count]) => (
                <div key={sentiment} className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text-secondary)] capitalize">{sentiment}</span>
                  <span className="text-[12px] font-medium text-[var(--text-primary)]">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Description
          </label>
          <RichTextEditor
            content={stage.description ?? ""}
            onChange={(html) => handleFieldUpdate("description", html)}
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
        <Button variant="destructive" size="sm" onClick={handleDelete} className="w-full">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Stage
        </Button>
      </div>
    </div>
  );
}
