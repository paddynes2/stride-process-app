"use client";

import * as React from "react";
import { Plus, X, Workflow, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createTab, deleteTab, updateTab } from "@/lib/api/client";
import type { Tab, CanvasType } from "@/types/database";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  workspaceId: string;
  onTabSelect: (tabId: string) => void;
  onTabsChange: () => void;
}

const CANVAS_TYPE_ICON: Record<CanvasType, React.ElementType> = {
  process: Workflow,
  journey: Route,
};

export function TabBar({ tabs, activeTabId, workspaceId, onTabSelect, onTabsChange }: TabBarProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");

  const handleAddTab = async (canvasType: CanvasType) => {
    const label = canvasType === "journey" ? "Journey" : "Process";
    try {
      const tab = await createTab({
        workspace_id: workspaceId,
        name: `${label} ${tabs.filter((t) => t.canvas_type === canvasType).length + 1}`,
        canvas_type: canvasType,
      });
      onTabsChange();
      onTabSelect(tab.id);
    } catch (err) {
      toastError("Failed to create tab", { error: err, retry: () => handleAddTab(canvasType) });
    }
  };

  const handleDeleteTab = async (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) {
      toast.error("Cannot delete the last tab");
      return;
    }
    try {
      await deleteTab(tabId);
      onTabsChange();
      if (activeTabId === tabId) {
        const remaining = tabs.filter((t) => t.id !== tabId);
        if (remaining.length > 0) onTabSelect(remaining[0].id);
      }
    } catch (err) {
      toastError("Failed to delete tab", { error: err });
    }
  };

  const handleDoubleClick = (tab: Tab) => {
    setEditingId(tab.id);
    setEditName(tab.name);
  };

  const handleRename = async (tabId: string) => {
    setEditingId(null);
    const trimmed = editName.trim();
    if (!trimmed) return;
    try {
      await updateTab(tabId, { name: trimmed });
      onTabsChange();
    } catch (err) {
      toastError("Failed to rename tab", { error: err });
    }
  };

  return (
    <div
      className="flex items-center gap-1 px-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      style={{ height: "var(--tab-bar-height)" }}
    >
      {[...tabs]
        .sort((a, b) => a.position - b.position)
        .map((tab) => {
          const Icon = CANVAS_TYPE_ICON[tab.canvas_type] ?? Workflow;
          return (
            <div
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              onDoubleClick={() => handleDoubleClick(tab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sm)] cursor-pointer",
                "text-[var(--text-sm)] font-medium transition-colors group",
                tab.id === activeTabId
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              {editingId === tab.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(tab.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="bg-transparent outline-none text-[var(--text-primary)] w-20 text-[var(--text-sm)]"
                />
              ) : (
                <span>{tab.name}</span>
              )}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleDeleteTab(e, tab.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--bg-surface-active)]"
                  aria-label={`Close ${tab.name} tab`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="ml-1" aria-label="Add new tab">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top">
          <DropdownMenuItem onClick={() => handleAddTab("process")}>
            <Workflow className="h-4 w-4" />
            Process tab
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddTab("journey")}>
            <Route className="h-4 w-4" />
            Journey tab
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
