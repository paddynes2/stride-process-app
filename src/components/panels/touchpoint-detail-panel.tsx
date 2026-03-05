"use client";

import * as React from "react";
import { X, Trash2, Zap, TrendingUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { updateTouchpoint, deleteTouchpoint as apiDeleteTouchpoint, createImprovementIdea } from "@/lib/api/client";
import type { Touchpoint, TouchpointSentiment, ImprovementPriority } from "@/types/database";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";

const SENTIMENT_OPTIONS: { value: TouchpointSentiment; label: string; color: string }[] = [
  { value: "positive", label: "Positive", color: "var(--accent-green)" },
  { value: "neutral", label: "Neutral", color: "var(--text-tertiary)" },
  { value: "negative", label: "Negative", color: "var(--accent-red)" },
];

const SCORE_LEVELS = [1, 2, 3, 4, 5] as const;

interface TouchpointDetailPanelProps {
  touchpoint: Touchpoint;
  onUpdate: (touchpoint: Touchpoint) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TouchpointDetailPanel({ touchpoint, onUpdate, onDelete, onClose }: TouchpointDetailPanelProps) {
  const [name, setName] = React.useState(touchpoint.name);
  const [customerEmotion, setCustomerEmotion] = React.useState(touchpoint.customer_emotion ?? "");
  const nameTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const emotionTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showImprovDialog, setShowImprovDialog] = React.useState(false);
  const [improvTitle, setImprovTitle] = React.useState("");
  const [improvDesc, setImprovDesc] = React.useState("");
  const [improvPriority, setImprovPriority] = React.useState<ImprovementPriority>("medium");
  const [improvSaving, setImprovSaving] = React.useState(false);

  React.useEffect(() => {
    setName(touchpoint.name);
    setCustomerEmotion(touchpoint.customer_emotion ?? "");
  }, [touchpoint.id, touchpoint.name, touchpoint.customer_emotion]);

  const handleFieldUpdate = async (field: string, value: unknown) => {
    try {
      const updated = await updateTouchpoint(touchpoint.id, { [field]: value });
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

  const handleEmotionChange = (newEmotion: string) => {
    setCustomerEmotion(newEmotion);
    clearTimeout(emotionTimeoutRef.current);
    emotionTimeoutRef.current = setTimeout(() => {
      handleFieldUpdate("customer_emotion", newEmotion.trim() || null);
    }, 500);
  };

  const handleDelete = async () => {
    try {
      await apiDeleteTouchpoint(touchpoint.id);
      onDelete(touchpoint.id);
      toast.success("Touchpoint deleted");
    } catch (err) {
      toastError("Failed to delete touchpoint", { error: err });
    }
  };

  const handleOpenImprovDialog = () => {
    setImprovTitle("");
    setImprovDesc("");
    setImprovPriority("medium");
    setShowImprovDialog(true);
  };

  const handleAddImprovement = async () => {
    if (!improvTitle.trim()) {
      toastError("Title is required");
      return;
    }
    setImprovSaving(true);
    try {
      await createImprovementIdea({
        workspace_id: touchpoint.workspace_id,
        title: improvTitle.trim(),
        description: improvDesc.trim() || undefined,
        priority: improvPriority,
        linked_touchpoint_id: touchpoint.id,
      });
      toast.success("Improvement added");
      setShowImprovDialog(false);
    } catch (err) {
      toastError("Failed to add improvement", { error: err });
    } finally {
      setImprovSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Touchpoint Details
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
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Touchpoint name" />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Sentiment
          </label>
          <div className="flex gap-1.5">
            {SENTIMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFieldUpdate("sentiment", opt.value)}
                className={`flex-1 h-8 rounded-[var(--radius-md)] text-[12px] font-medium border transition-colors ${
                  touchpoint.sentiment === opt.value
                    ? "border-current"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                }`}
                style={{
                  color: opt.color,
                  backgroundColor: touchpoint.sentiment === opt.value ? `color-mix(in srgb, ${opt.color} 12%, transparent)` : "var(--bg-surface)",
                }}
                aria-label={`Set sentiment to ${opt.label}`}
                aria-pressed={touchpoint.sentiment === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Pain score */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Pain Score
          </label>
          <div className="flex gap-1">
            {SCORE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleFieldUpdate("pain_score", touchpoint.pain_score === level ? null : level)}
                className={`flex-1 h-8 rounded-[var(--radius-md)] text-[12px] font-medium border transition-colors ${
                  touchpoint.pain_score === level
                    ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)] text-[var(--accent-red)]"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                }`}
                aria-label={`Pain score ${level}`}
                aria-pressed={touchpoint.pain_score === level}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">1 = low pain, 5 = high pain</p>
        </div>

        {/* Gain score */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Gain Score
          </label>
          <div className="flex gap-1">
            {SCORE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleFieldUpdate("gain_score", touchpoint.gain_score === level ? null : level)}
                className={`flex-1 h-8 rounded-[var(--radius-md)] text-[12px] font-medium border transition-colors ${
                  touchpoint.gain_score === level
                    ? "bg-[var(--accent-green)]/15 border-[var(--accent-green)] text-[var(--accent-green)]"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                }`}
                aria-label={`Gain score ${level}`}
                aria-pressed={touchpoint.gain_score === level}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">1 = low gain, 5 = high gain</p>
        </div>

        {/* Effort Score */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
            <Zap className="h-3 w-3" />
            Effort Score
          </label>
          <div className="flex gap-1">
            {SCORE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleFieldUpdate("effort_score", touchpoint.effort_score === level ? null : level)}
                className={`flex-1 h-8 rounded-[var(--radius-md)] text-[12px] font-medium border transition-colors ${
                  touchpoint.effort_score === level
                    ? "bg-[#F97316]/15 border-[#F97316] text-[#F97316]"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                }`}
                aria-label={`Effort score ${level}`}
                aria-pressed={touchpoint.effort_score === level}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">1 = low effort, 5 = high effort</p>
        </div>

        {/* Impact Score */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
            <TrendingUp className="h-3 w-3" />
            Impact Score
          </label>
          <div className="flex gap-1">
            {SCORE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleFieldUpdate("impact_score", touchpoint.impact_score === level ? null : level)}
                className={`flex-1 h-8 rounded-[var(--radius-md)] text-[12px] font-medium border transition-colors ${
                  touchpoint.impact_score === level
                    ? "bg-[var(--brand)]/15 border-[var(--brand)] text-[var(--brand)]"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                }`}
                aria-label={`Impact score ${level}`}
                aria-pressed={touchpoint.impact_score === level}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">1 = low impact, 5 = high impact</p>
        </div>

        <Separator />

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Customer Emotion
          </label>
          <Input
            value={customerEmotion}
            onChange={(e) => handleEmotionChange(e.target.value)}
            placeholder="e.g., Frustrated, Delighted, Confused"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Notes
          </label>
          <RichTextEditor
            content={touchpoint.notes ?? ""}
            onChange={(html) => handleFieldUpdate("notes", html)}
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[var(--border-subtle)] space-y-2">
        <Button variant="secondary" size="sm" onClick={handleOpenImprovDialog} className="w-full">
          <Lightbulb className="h-3.5 w-3.5" />
          Add Improvement
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete} className="w-full">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Touchpoint
        </Button>
      </div>

      <Dialog open={showImprovDialog} onOpenChange={setShowImprovDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogPrimitive.Title className="text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
              Add Improvement
            </DialogPrimitive.Title>
            <DialogDescription>Log an improvement idea for this touchpoint</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
                Title
              </label>
              <Input
                value={improvTitle}
                onChange={(e) => setImprovTitle(e.target.value)}
                placeholder="Describe the improvement..."
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
                Description
              </label>
              <Textarea
                value={improvDesc}
                onChange={(e) => setImprovDesc(e.target.value)}
                placeholder="Additional details (optional)"
                rows={3}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
                Priority
              </label>
              <select
                value={improvPriority}
                onChange={(e) => setImprovPriority(e.target.value as ImprovementPriority)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] text-[13px] bg-[var(--input-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-default)]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowImprovDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddImprovement} disabled={improvSaving}>
              {improvSaving ? "Adding..." : "Add Improvement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
