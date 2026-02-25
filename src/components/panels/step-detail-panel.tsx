"use client";

import * as React from "react";
import { X, Trash2, Clock, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "./rich-text-editor";
import { VideoEmbed } from "./video-embed";
import { updateStep, deleteStep as apiDeleteStep } from "@/lib/api/client";
import type { Step, StepStatus, ExecutorType } from "@/types/database";
import { toast } from "sonner";

const STATUSES: { value: StepStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "testing", label: "Testing" },
  { value: "live", label: "Live" },
  { value: "archived", label: "Archived" },
];

const EXECUTORS: { value: ExecutorType; label: string }[] = [
  { value: "person", label: "Person" },
  { value: "automation", label: "Automation" },
  { value: "ai_agent", label: "AI Agent" },
  { value: "empty", label: "Unassigned" },
];

interface StepDetailPanelProps {
  step: Step;
  onUpdate: (step: Step) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function StepDetailPanel({ step, onUpdate, onDelete, onClose }: StepDetailPanelProps) {
  const [name, setName] = React.useState(step.name);
  const nameTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    setName(step.name);
  }, [step.id, step.name]);

  const handleFieldUpdate = async (field: string, value: unknown) => {
    try {
      const updated = await updateStep(step.id, { [field]: value });
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
      await apiDeleteStep(step.id);
      onDelete(step.id);
      toast.success("Step deleted");
    } catch {
      toast.error("Failed to delete step");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Step Details
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Name */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Step name"
          />
        </div>

        {/* Status */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleFieldUpdate("status", s.value)}
                className="transition-all"
              >
                <Badge
                  variant={s.value as "draft" | "in_progress" | "testing" | "live" | "archived"}
                  className={step.status === s.value ? "ring-1 ring-[var(--text-tertiary)]" : "opacity-50 hover:opacity-80"}
                >
                  {s.label}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Step Type */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Type
          </label>
          <Input
            value={step.step_type ?? ""}
            onChange={(e) => handleFieldUpdate("step_type", e.target.value || null)}
            placeholder="e.g., Review, Approval, Data Entry"
          />
        </div>

        {/* Executor */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Executor
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EXECUTORS.map((ex) => (
              <button
                key={ex.value}
                onClick={() => handleFieldUpdate("executor", ex.value)}
                className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium border transition-all ${
                  step.executor === ex.value
                    ? "bg-[var(--bg-surface-active)] border-[var(--border-default)] text-[var(--text-primary)]"
                    : "bg-transparent border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Time & Frequency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Clock className="h-3 w-3" />
              Minutes
            </label>
            <Input
              type="number"
              min={0}
              value={step.time_minutes ?? ""}
              onChange={(e) => handleFieldUpdate("time_minutes", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
              <Repeat className="h-3 w-3" />
              Per Month
            </label>
            <Input
              type="number"
              min={0}
              value={step.frequency_per_month ?? ""}
              onChange={(e) => handleFieldUpdate("frequency_per_month", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="0"
            />
          </div>
        </div>

        {step.time_minutes && step.frequency_per_month ? (
          <div className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-surface-hover)] rounded-[var(--radius-sm)] p-2">
            Monthly cost: <strong className="text-[var(--text-secondary)]">{((step.time_minutes * step.frequency_per_month) / 60).toFixed(1)}h</strong> / month
          </div>
        ) : null}

        <Separator />

        {/* Notes */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Notes
          </label>
          <RichTextEditor
            content={step.notes ?? ""}
            onChange={(html) => handleFieldUpdate("notes", html)}
          />
        </div>

        <Separator />

        {/* Video */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Video
          </label>
          <VideoEmbed
            url={step.video_url}
            onChange={(url) => handleFieldUpdate("video_url", url)}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
        <Button variant="destructive" size="sm" onClick={handleDelete} className="w-full">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Step
        </Button>
      </div>
    </div>
  );
}
