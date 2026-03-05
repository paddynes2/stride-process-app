"use client";

import * as React from "react";
import { MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchComments, createComment, updateComment } from "@/lib/api/client";
import type { Comment, CommentCategory, CommentableType } from "@/types/database";
import { useWorkspace } from "@/lib/context/workspace-context";
import { toastError } from "@/lib/api/toast-helpers";
import { cn } from "@/lib/utils";

function formatRelativeTime(dateString: string): string {
  const diffSecs = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  return `${Math.floor(diffSecs / 86400)}d ago`;
}

// Category badge colors: note=gray, decision=blue, pain_point=red, idea=yellow, question=purple
function CategoryBadge({ category }: { category: CommentCategory }) {
  const map: Record<CommentCategory, React.ComponentProps<typeof Badge>["variant"]> = {
    note: "secondary",
    decision: "default",
    pain_point: "destructive",
    idea: "warning",
    question: "info",
  };
  const labels: Record<CommentCategory, string> = {
    note: "Note",
    decision: "Decision",
    pain_point: "Pain Point",
    idea: "Idea",
    question: "Question",
  };
  return <Badge variant={map[category]}>{labels[category]}</Badge>;
}

const CATEGORY_OPTIONS: { value: CommentCategory; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "decision", label: "Decision" },
  { value: "pain_point", label: "Pain Point" },
  { value: "idea", label: "Idea" },
  { value: "question", label: "Question" },
];

interface ReplyFormProps {
  content: string;
  category: CommentCategory;
  submitting: boolean;
  onContentChange: (v: string) => void;
  onCategoryChange: (c: CommentCategory) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function ReplyForm({ content, category, submitting, onContentChange, onCategoryChange, onSubmit, onCancel }: ReplyFormProps) {
  return (
    <div className="mt-2 space-y-1.5">
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value as CommentCategory)}
        className="text-[11px] bg-[var(--bg-surface-active)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-1.5 py-1 text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-default)]"
      >
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Reply..."
        rows={2}
        autoFocus
        className="w-full text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--border-default)]"
      />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={onSubmit} disabled={submitting || !content.trim()}>
          {submitting ? "Posting…" : "Reply"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  replies: Comment[];
  isExpanded: boolean;
  isReplying: boolean;
  replyContent: string;
  replyCategory: CommentCategory;
  submitting: boolean;
  onExpandToggle: () => void;
  onReplyClick: () => void;
  onReplyContentChange: (v: string) => void;
  onReplyCategoryChange: (c: CommentCategory) => void;
  onReplySubmit: () => void;
  onResolveToggle: () => void;
}

function CommentItem({
  comment,
  replies,
  isExpanded,
  isReplying,
  replyContent,
  replyCategory,
  submitting,
  onExpandToggle,
  onReplyClick,
  onReplyContentChange,
  onReplyCategoryChange,
  onReplySubmit,
  onResolveToggle,
}: CommentItemProps) {
  const showThread = isExpanded || isReplying;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] p-2.5 bg-[var(--bg-surface-active)] transition-opacity",
        comment.is_resolved && "opacity-40"
      )}
    >
      {/* Meta */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className="text-[11px] text-[var(--text-secondary)] font-mono">{comment.author_id.slice(0, 8)}</span>
        <span className="text-[11px] text-[var(--text-quaternary)]">·</span>
        <span className="text-[11px] text-[var(--text-tertiary)]">{formatRelativeTime(comment.created_at)}</span>
        <CategoryBadge category={comment.category} />
        <button
          onClick={onResolveToggle}
          aria-label={comment.is_resolved ? "Unresolve comment" : "Resolve comment"}
          className={cn(
            "ml-auto flex items-center rounded px-1 py-0.5 transition-colors",
            comment.is_resolved
              ? "text-[var(--success)]"
              : "text-[var(--text-quaternary)] hover:text-[var(--text-secondary)]"
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <p className="text-[12px] text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap mb-2">
        {comment.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {replies.length > 0 && !isReplying && (
          <button
            onClick={onExpandToggle}
            className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {isExpanded ? "Hide replies" : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
          </button>
        )}
        <button
          onClick={onReplyClick}
          className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {isReplying ? "Cancel" : "Reply"}
        </button>
      </div>

      {/* Thread */}
      {showThread && (
        <div className="mt-2 ml-3 pl-3 border-l border-[var(--border-subtle)] space-y-2">
          {isExpanded && replies.map((reply) => (
            <div key={reply.id} className={cn("text-[12px]", reply.is_resolved && "opacity-40")}>
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-[11px] text-[var(--text-secondary)] font-mono">{reply.author_id.slice(0, 8)}</span>
                <span className="text-[11px] text-[var(--text-quaternary)]">·</span>
                <span className="text-[11px] text-[var(--text-tertiary)]">{formatRelativeTime(reply.created_at)}</span>
                <CategoryBadge category={reply.category} />
              </div>
              <p className="text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
                {reply.content}
              </p>
            </div>
          ))}
          {isReplying && (
            <ReplyForm
              content={replyContent}
              category={replyCategory}
              submitting={submitting}
              onContentChange={onReplyContentChange}
              onCategoryChange={onReplyCategoryChange}
              onSubmit={onReplySubmit}
              onCancel={onReplyClick}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface CommentPanelProps {
  commentableType: CommentableType;
  commentableId: string;
}

export function CommentPanel({ commentableType, commentableId }: CommentPanelProps) {
  const { workspace } = useWorkspace();
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedThreads, setExpandedThreads] = React.useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [replyContent, setReplyContent] = React.useState("");
  const [replyCategory, setReplyCategory] = React.useState<CommentCategory>("note");
  const [topContent, setTopContent] = React.useState("");
  const [topCategory, setTopCategory] = React.useState<CommentCategory>("note");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setComments([]);
    setReplyingTo(null);
    setExpandedThreads(new Set());
    fetchComments(workspace.id, {
      commentable_type: commentableType,
      commentable_id: commentableId,
    })
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toastError("Failed to load comments", { error: err });
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [workspace.id, commentableType, commentableId]);

  const handleSubmitTop = async () => {
    const content = topContent.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const comment = await createComment({
        workspace_id: workspace.id,
        commentable_type: commentableType,
        commentable_id: commentableId,
        content,
        category: topCategory,
      });
      setComments((prev) => [...prev, comment]);
      setTopContent("");
    } catch (err) {
      toastError("Failed to add comment", { error: err });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    const content = replyContent.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const comment = await createComment({
        workspace_id: workspace.id,
        commentable_type: commentableType,
        commentable_id: commentableId,
        content,
        category: replyCategory,
        parent_id: parentId,
      });
      setComments((prev) => [...prev, comment]);
      setReplyContent("");
      setReplyingTo(null);
      setExpandedThreads((prev) => new Set([...prev, parentId]));
    } catch (err) {
      toastError("Failed to add reply", { error: err });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveToggle = async (comment: Comment) => {
    try {
      const updated = await updateComment(comment.id, { is_resolved: !comment.is_resolved });
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      toastError("Failed to update comment", { error: err });
    }
  };

  const handleReplyClick = (commentId: string) => {
    if (replyingTo === commentId) {
      setReplyingTo(null);
      setReplyContent("");
    } else {
      setReplyingTo(commentId);
      setReplyContent("");
      setReplyCategory("note");
      // Auto-expand thread so existing replies are visible
      setExpandedThreads((prev) => new Set([...prev, commentId]));
    }
  };

  const topLevel = comments.filter((c) => c.parent_id === null);

  if (loading) {
    return (
      <div className="border-t border-[var(--border-subtle)] p-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3.5 w-3.5 rounded bg-[var(--bg-surface-active)] animate-pulse" />
          <div className="h-3 w-20 bg-[var(--bg-surface-active)] rounded animate-pulse" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="mb-2">
            <div className="h-3 w-24 bg-[var(--bg-surface-active)] rounded animate-pulse mb-1.5" />
            <div className="h-10 bg-[var(--bg-surface-active)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border-subtle)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0">
        <MessageSquare className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Comments
        </span>
        {topLevel.length > 0 && (
          <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">{topLevel.length}</span>
        )}
      </div>

      {/* Comment list */}
      <div className="px-4 pb-2">
        {topLevel.length === 0 ? (
          <p className="text-[12px] text-[var(--text-tertiary)] py-1">No comments yet</p>
        ) : (
          <div className="space-y-2">
            {topLevel.map((comment) => {
              const replies = comments.filter((c) => c.parent_id === comment.id);
              return (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={replies}
                  isExpanded={expandedThreads.has(comment.id)}
                  isReplying={replyingTo === comment.id}
                  replyContent={replyingTo === comment.id ? replyContent : ""}
                  replyCategory={replyingTo === comment.id ? replyCategory : "note"}
                  submitting={submitting}
                  onExpandToggle={() =>
                    setExpandedThreads((prev) => {
                      const next = new Set(prev);
                      if (next.has(comment.id)) next.delete(comment.id);
                      else next.add(comment.id);
                      return next;
                    })
                  }
                  onReplyClick={() => handleReplyClick(comment.id)}
                  onReplyContentChange={setReplyContent}
                  onReplyCategoryChange={setReplyCategory}
                  onReplySubmit={() => handleSubmitReply(comment.id)}
                  onResolveToggle={() => handleResolveToggle(comment)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Add comment form */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] px-4 py-3">
        <div className="mb-1.5">
          <select
            value={topCategory}
            onChange={(e) => setTopCategory(e.target.value as CommentCategory)}
            className="text-[11px] bg-[var(--bg-surface-active)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-1.5 py-1 text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-default)]"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <textarea
          value={topContent}
          onChange={(e) => setTopContent(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="w-full text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--border-default)] mb-1.5"
        />
        <Button
          size="sm"
          onClick={handleSubmitTop}
          disabled={submitting || !topContent.trim()}
        >
          {submitting ? "Posting…" : "Comment"}
        </Button>
      </div>
    </div>
  );
}
