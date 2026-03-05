"use client";

import * as React from "react";
import { GripVertical, ListTodo, X } from "lucide-react";
import { fetchTasks, createTask, updateTask, deleteTask } from "@/lib/api/client";
import type { Task } from "@/types/database";
import { toastError } from "@/lib/api/toast-helpers";
import { cn } from "@/lib/utils";

interface TaskPanelProps {
  workspaceId: string;
  stepId: string;
}

export function TaskPanel({ workspaceId, stepId }: TaskPanelProps) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newTitle, setNewTitle] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const draggedId = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTasks([]);
    setEditingId(null);
    fetchTasks(workspaceId, stepId)
      .then((data) => {
        if (!cancelled) {
          setTasks([...data].sort((a, b) => a.position - b.position));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toastError("Failed to load tasks", { error: err });
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [workspaceId, stepId]);

  const handleToggle = async (task: Task) => {
    try {
      const updated = await updateTask(task.id, { is_completed: !task.is_completed });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      toastError("Failed to update task", { error: err });
    }
  };

  const handleEditStart = (task: Task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  const handleEditSave = async (task: Task) => {
    const title = editingTitle.trim();
    setEditingId(null);
    if (!title || title === task.title) return;
    const oldTitle = task.title;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title } : t)));
    try {
      await updateTask(task.id, { title });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title: oldTitle } : t)));
      toastError("Failed to update task", { error: err });
    }
  };

  const handleDelete = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteTask(taskId);
    } catch (err) {
      toastError("Failed to delete task", { error: err });
    }
  };

  const handleAddTask = async () => {
    const title = newTitle.trim();
    if (!title || submitting) return;
    setSubmitting(true);
    setNewTitle("");
    try {
      const created = await createTask({ workspace_id: workspaceId, step_id: stepId, title });
      setTasks((prev) => [...prev, created]);
    } catch (err) {
      setNewTitle(title);
      toastError("Failed to add task", { error: err });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragStart = (taskId: string) => {
    draggedId.current = taskId;
  };

  const handleDrop = async (targetId: string) => {
    const sourceId = draggedId.current;
    draggedId.current = null;
    if (!sourceId || sourceId === targetId) return;
    const reordered = [...tasks];
    const fromIdx = reordered.findIndex((t) => t.id === sourceId);
    const toIdx = reordered.findIndex((t) => t.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withPositions = reordered.map((t, i) => ({ ...t, position: i }));
    const originalPositions = new Map(tasks.map((t) => [t.id, t.position]));
    const changed = withPositions.filter((t) => originalPositions.get(t.id) !== t.position);
    setTasks(withPositions);
    try {
      await Promise.all(changed.map((t) => updateTask(t.id, { position: t.position })));
    } catch (err) {
      toastError("Failed to reorder tasks", { error: err });
    }
  };

  if (loading) {
    return (
      <div className="border-t border-[var(--border-subtle)] p-4 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3.5 w-3.5 rounded bg-[var(--bg-surface-active)] animate-pulse" />
          <div className="h-3 w-16 bg-[var(--bg-surface-active)] rounded animate-pulse" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-7 bg-[var(--bg-surface-active)] rounded animate-pulse mb-2" />
        ))}
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="border-t border-[var(--border-subtle)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0">
        <ListTodo className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Tasks
        </span>
        {tasks.length > 0 && (
          <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">
            {completedCount}/{tasks.length}
          </span>
        )}
      </div>

      {/* Task list */}
      <div className="px-4 pb-2">
        {tasks.length === 0 ? (
          <p className="text-[12px] text-[var(--text-tertiary)] py-1">No tasks yet</p>
        ) : (
          <div className="space-y-0.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(task.id)}
                className="flex items-center gap-2 group rounded-[var(--radius-sm)] px-1 py-1 hover:bg-[var(--bg-surface-active)] transition-colors"
              >
                <GripVertical
                  className="h-3 w-3 text-[var(--text-quaternary)] cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />

                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(task)}
                  aria-label={task.is_completed ? "Mark incomplete" : "Mark complete"}
                  className="shrink-0 h-4 w-4 rounded-sm border flex items-center justify-center transition-colors"
                  style={
                    task.is_completed
                      ? { backgroundColor: "var(--accent-blue)", borderColor: "var(--accent-blue)" }
                      : { borderColor: "var(--border-default)" }
                  }
                >
                  {task.is_completed && (
                    <svg
                      className="h-2.5 w-2.5 text-white"
                      fill="none"
                      viewBox="0 0 12 12"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  )}
                </button>

                {/* Title: inline edit or display */}
                {editingId === task.id ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleEditSave(task)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleEditSave(task); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 text-[12px] bg-[var(--input-bg)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[var(--text-primary)] focus:outline-none"
                  />
                ) : (
                  <span
                    onClick={() => handleEditStart(task)}
                    className={cn(
                      "flex-1 text-[12px] cursor-text truncate",
                      task.is_completed
                        ? "line-through text-[var(--text-tertiary)]"
                        : "text-[var(--text-primary)]"
                    )}
                  >
                    {task.title}
                  </span>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(task.id)}
                  aria-label="Delete task"
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-quaternary)] hover:text-[var(--error)] transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add task input */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] px-4 py-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleAddTask(); }
          }}
          placeholder="Add a task… (Enter to save)"
          disabled={submitting}
          className="w-full text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-default)]"
        />
      </div>
    </div>
  );
}
