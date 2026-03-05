"use client";

import * as React from "react";
import { MessageSquareText, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import {
  fetchAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation as apiDeleteAnnotation,
} from "@/lib/api/client";
import type { PerspectiveAnnotation, AnnotatableType } from "@/types/database";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((mod) => ({ default: mod.RichTextEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[80px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] animate-pulse" />
    ),
  }
);

interface AnnotationPanelProps {
  perspectiveId: string;
  perspectiveName: string;
  perspectiveColor: string;
  annotatableType: AnnotatableType;
  annotatableId: string;
  onAnnotationChange?: () => void;
}

export function AnnotationPanel({
  perspectiveId,
  perspectiveName,
  perspectiveColor,
  annotatableType,
  annotatableId,
  onAnnotationChange,
}: AnnotationPanelProps) {
  const [annotation, setAnnotation] = React.useState<PerspectiveAnnotation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const contentTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch existing annotation for this perspective + element
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAnnotation(null);
    fetchAnnotations(perspectiveId, {
      annotatable_type: annotatableType,
      annotatable_id: annotatableId,
    })
      .then((annotations) => {
        if (!cancelled) {
          setAnnotation(annotations.length > 0 ? annotations[0] : null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toastError("Failed to load annotation", { error: err });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [perspectiveId, annotatableType, annotatableId]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      clearTimeout(contentTimeoutRef.current);
    };
  }, []);

  const handleContentChange = (html: string) => {
    clearTimeout(contentTimeoutRef.current);
    contentTimeoutRef.current = setTimeout(async () => {
      try {
        if (annotation) {
          const updated = await updateAnnotation(annotation.id, { content: html });
          setAnnotation(updated);
        } else {
          const created = await createAnnotation({
            perspective_id: perspectiveId,
            annotatable_type: annotatableType,
            annotatable_id: annotatableId,
            content: html,
          });
          setAnnotation(created);
          onAnnotationChange?.();
        }
      } catch (err) {
        toastError("Failed to save annotation", { error: err });
      }
    }, 500);
  };

  const handleRatingChange = async (rating: number) => {
    const newRating = annotation?.rating === rating ? null : rating;
    try {
      if (annotation) {
        const updated = await updateAnnotation(annotation.id, { rating: newRating });
        setAnnotation(updated);
      } else {
        const created = await createAnnotation({
          perspective_id: perspectiveId,
          annotatable_type: annotatableType,
          annotatable_id: annotatableId,
          rating: newRating ?? undefined,
        });
        setAnnotation(created);
        onAnnotationChange?.();
      }
    } catch (err) {
      toastError("Failed to save rating", { error: err });
    }
  };

  const handleDelete = async () => {
    if (!annotation) return;
    try {
      await apiDeleteAnnotation(annotation.id);
      setAnnotation(null);
      toast.success("Annotation removed");
      onAnnotationChange?.();
    } catch (err) {
      toastError("Failed to delete annotation", { error: err });
    }
  };

  if (loading) {
    return (
      <div className="border-t-2 p-4" style={{ borderColor: perspectiveColor }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3.5 w-3.5 rounded bg-[var(--bg-surface-hover)] animate-pulse" />
          <div className="h-3 w-28 bg-[var(--bg-surface-hover)] rounded animate-pulse" />
        </div>
        <div className="h-7 bg-[var(--bg-surface-hover)] rounded animate-pulse mb-3" />
        <div className="h-[80px] bg-[var(--bg-surface-hover)] rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className="border-t-2 flex flex-col"
      style={{ borderColor: perspectiveColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-3.5 w-3.5" style={{ color: perspectiveColor }} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            {perspectiveName}
          </span>
        </div>
        {annotation && (
          <Button variant="ghost" size="icon-sm" onClick={handleDelete} aria-label="Delete annotation">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Rating */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1.5">
            <Star className="h-3 w-3" />
            Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                onClick={() => handleRatingChange(val)}
                className={`flex-1 h-7 rounded-[var(--radius-sm)] text-[12px] font-semibold border transition-all ${
                  annotation?.rating === val
                    ? "border-[var(--border-default)] text-white"
                    : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                }`}
                style={annotation?.rating === val ? { backgroundColor: perspectiveColor } : undefined}
                aria-label={`Rate ${val} out of 5`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Notes
          </label>
          <RichTextEditor
            content={annotation?.content ?? ""}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}
