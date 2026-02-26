"use client";

import * as React from "react";
import { Wrench, Plus, Trash2, DollarSign, Tag, Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchTools,
  createTool,
  updateTool,
  deleteTool,
} from "@/lib/api/client";
import type { Tool } from "@/types/database";

interface ToolsViewProps {
  workspaceId: string;
  initialTools: Tool[];
}

export function ToolsView({ workspaceId, initialTools }: ToolsViewProps) {
  const [tools, setTools] = React.useState<Tool[]>(initialTools);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);

  const sortedTools = React.useMemo(
    () => [...tools].sort((a, b) => a.name.localeCompare(b.name)),
    [tools]
  );

  const uniqueCategories = React.useMemo(
    () => [...new Set(tools.map((t) => t.category).filter(Boolean))].sort() as string[],
    [tools]
  );

  const categories = React.useMemo(
    () => new Set(tools.map((t) => t.category).filter(Boolean)).size,
    [tools]
  );

  const filtered = React.useMemo(() => {
    let result = [...sortedTools];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.category ?? "").toLowerCase().includes(q) ||
          (t.vendor ?? "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter);
    }
    return result;
  }, [sortedTools, search, categoryFilter]);

  const totalCost = React.useMemo(
    () => tools.reduce((sum, t) => sum + (t.cost_per_month ?? 0), 0),
    [tools]
  );

  const refresh = React.useCallback(async () => {
    const data = await fetchTools(workspaceId);
    setTools(data);
  }, [workspaceId]);

  const handleAdd = async () => {
    setLoading(true);
    try {
      await createTool({ workspace_id: workspaceId, name: "New Tool" });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<Pick<Tool, "name" | "description" | "category" | "vendor" | "url" | "cost_per_month">>) => {
    await updateTool(id, data);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tool? This action cannot be undone.")) return;
    await deleteTool(id);
    await refresh();
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-[var(--text-tertiary)]" />
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
              Tools
            </h1>
          </div>
          <Button onClick={handleAdd} disabled={loading} size="sm">
            <Plus className="h-3.5 w-3.5" />
            Add Tool
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="Tools" value={tools.length} />
          <SummaryCard label="Categories" value={categories} />
          <SummaryCard label="Monthly Cost" value={totalCost > 0 ? `$${totalCost.toLocaleString()}` : "$0"} />
        </div>

        {/* Filters */}
        {tools.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 max-w-xs">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools..."
                leftElement={<Search className="h-3.5 w-3.5" />}
                aria-label="Search tools"
              />
            </div>
            {uniqueCategories.length > 0 && (
              <select
                value={categoryFilter ?? ""}
                onChange={(e) => setCategoryFilter(e.target.value || null)}
                className="h-8 px-3 text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--signal)]"
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Tools table */}
        {tools.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
            <Wrench className="h-8 w-8 text-[var(--text-quaternary)] mx-auto mb-3" />
            <p className="text-[14px] text-[var(--text-secondary)] mb-1">
              No tools yet
            </p>
            <p className="text-[12px] text-[var(--text-quaternary)] mb-4">
              Track the software and systems used in your processes
            </p>
            <Button onClick={handleAdd} disabled={loading} size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add Tool
            </Button>
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_120px_120px_100px_36px] items-center px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
              <span>Name</span>
              <span>Category</span>
              <span>Vendor</span>
              <span>Cost/mo</span>
              <span />
            </div>
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--text-tertiary)]">
                No tools match your filters
              </div>
            ) : (
              filtered.map((tool) => (
                <ToolRow
                  key={tool.id}
                  tool={tool}
                  onUpdate={(data) => handleUpdate(tool.id, data)}
                  onDelete={() => handleDelete(tool.id)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
        {label}
      </div>
      <div className="text-[24px] font-semibold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Row
// ---------------------------------------------------------------------------

interface ToolRowProps {
  tool: Tool;
  onUpdate: (data: Partial<Pick<Tool, "name" | "category" | "vendor" | "url" | "cost_per_month">>) => void;
  onDelete: () => void;
}

function ToolRow({ tool, onUpdate, onDelete }: ToolRowProps) {
  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(tool.name);
  const [categoryValue, setCategoryValue] = React.useState(tool.category ?? "");
  const [vendorValue, setVendorValue] = React.useState(tool.vendor ?? "");
  const [costValue, setCostValue] = React.useState(tool.cost_per_month?.toString() ?? "");
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { setNameValue(tool.name); }, [tool.name]);
  React.useEffect(() => { setCategoryValue(tool.category ?? ""); }, [tool.category]);
  React.useEffect(() => { setVendorValue(tool.vendor ?? ""); }, [tool.vendor]);
  React.useEffect(() => { setCostValue(tool.cost_per_month?.toString() ?? ""); }, [tool.cost_per_month]);

  React.useEffect(() => {
    if (editingName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [editingName]);

  const commitName = () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue.trim() !== tool.name) {
      onUpdate({ name: nameValue.trim() });
    } else {
      setNameValue(tool.name);
    }
  };

  const commitCategory = () => {
    const trimmed = categoryValue.trim();
    if (trimmed !== (tool.category ?? "")) {
      onUpdate({ category: trimmed || null });
    }
  };

  const commitVendor = () => {
    const trimmed = vendorValue.trim();
    if (trimmed !== (tool.vendor ?? "")) {
      onUpdate({ vendor: trimmed || null });
    }
  };

  const commitCost = () => {
    const parsed = costValue.trim() ? parseFloat(costValue.trim()) : null;
    const current = tool.cost_per_month ?? null;
    if (parsed !== current && (parsed === null || !isNaN(parsed))) {
      onUpdate({ cost_per_month: parsed });
    } else {
      setCostValue(tool.cost_per_month?.toString() ?? "");
    }
  };

  return (
    <div className="grid grid-cols-[1fr_120px_120px_100px_36px] items-center px-4 py-2 border-t border-[var(--border-subtle)] hover:bg-[var(--bg-row-hover)] transition-colors">
      {/* Name */}
      {editingName ? (
        <Input
          ref={nameRef}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitName();
            if (e.key === "Escape") {
              setNameValue(tool.name);
              setEditingName(false);
            }
          }}
          className="h-6 max-w-[200px] text-[12px]"
          aria-label="Tool name"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="text-[13px] text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors truncate text-left flex items-center gap-2"
        >
          <Wrench className="h-3.5 w-3.5 text-[var(--text-quaternary)] shrink-0" />
          {tool.name}
        </button>
      )}

      {/* Category */}
      <div className="flex items-center gap-1.5">
        <Tag className="h-3 w-3 text-[var(--text-quaternary)] shrink-0" />
        <Input
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value)}
          onBlur={commitCategory}
          onKeyDown={(e) => { if (e.key === "Enter") commitCategory(); }}
          placeholder="—"
          className="h-6 text-[12px]"
          aria-label={`Category for ${tool.name}`}
        />
      </div>

      {/* Vendor */}
      <div className="flex items-center gap-1.5">
        <Building2 className="h-3 w-3 text-[var(--text-quaternary)] shrink-0" />
        <Input
          value={vendorValue}
          onChange={(e) => setVendorValue(e.target.value)}
          onBlur={commitVendor}
          onKeyDown={(e) => { if (e.key === "Enter") commitVendor(); }}
          placeholder="—"
          className="h-6 text-[12px]"
          aria-label={`Vendor for ${tool.name}`}
        />
      </div>

      {/* Cost/mo */}
      <div className="flex items-center gap-1.5">
        <DollarSign className="h-3 w-3 text-[var(--text-quaternary)] shrink-0" />
        <Input
          value={costValue}
          onChange={(e) => setCostValue(e.target.value)}
          onBlur={commitCost}
          onKeyDown={(e) => { if (e.key === "Enter") commitCost(); }}
          placeholder="—"
          type="number"
          min="0"
          step="0.01"
          className="h-6 text-[12px]"
          aria-label={`Monthly cost for ${tool.name}`}
        />
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        className="h-6 w-6 text-[var(--text-quaternary)] hover:text-[var(--error)]"
        aria-label={`Delete ${tool.name}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
