"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createTab, deleteTab, updateTab } from "@/lib/api/client";
import type { Tab } from "@/types/database";
import { toast } from "sonner";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  workspaceId: string;
  onTabSelect: (tabId: string) => void;
  onTabsChange: () => void;
}

export function TabBar({ tabs, activeTabId, workspaceId, onTabSelect, onTabsChange }: TabBarProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");

  const handleAddTab = async () => {
    try {
      const tab = await createTab({
        workspace_id: workspaceId,
        name: `Tab ${tabs.length + 1}`,
      });
      onTabsChange();
      onTabSelect(tab.id);
    } catch (err) {
      toast.error("Failed to create tab");
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
      toast.error("Failed to delete tab");
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
      toast.error("Failed to rename tab");
    }
  };

  return (
    <div
      className="flex items-center gap-1 px-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      style={{ height: "var(--tab-bar-height)" }}
    >
      {[...tabs]
        .sort((a, b) => a.position - b.position)
        .map((tab) => (
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
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      <Button variant="ghost" size="icon-sm" onClick={handleAddTab} className="ml-1">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
