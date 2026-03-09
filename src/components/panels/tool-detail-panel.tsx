"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import dynamic from "next/dynamic";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateTool, deleteTool as apiDeleteTool, fetchStepToolsByTool } from "@/lib/api/client";
import type { StepToolWithStep } from "@/lib/api/client";
import type { Tool, ToolStatus, Step } from "@/types/database";
import { useWorkspace } from "@/lib/context/workspace-context";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((mod) => ({ default: mod.RichTextEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] animate-pulse" />
    ),
  }
);

const STATUS_OPTIONS: { value: ToolStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "considering", label: "Considering" },
  { value: "cancelled", label: "Cancelled" },
];

interface ToolDetailPanelProps {
  tool: Tool;
  onUpdate: (tool: Tool) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ToolDetailPanel({ tool, onUpdate, onDelete, onClose }: ToolDetailPanelProps) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [name, setName] = React.useState(tool.name);
  const [status, setStatus] = React.useState(tool.status);
  const [category, setCategory] = React.useState(tool.category ?? "");
  const [vendor, setVendor] = React.useState(tool.vendor ?? "");
  const [url, setUrl] = React.useState(tool.url ?? "");
  const [logoUrl, setLogoUrl] = React.useState(tool.logo_url ?? "");
  const [costPerMonth, setCostPerMonth] = React.useState(
    tool.cost_per_month != null ? String(tool.cost_per_month) : ""
  );
  const [stepTools, setStepTools] = React.useState<StepToolWithStep[]>([]);
  const [stepTabMap, setStepTabMap] = React.useState<Record<string, string>>({});
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const nameTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const categoryTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const vendorTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const urlTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const logoUrlTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const costTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    setName(tool.name);
    setStatus(tool.status);
    setCategory(tool.category ?? "");
    setVendor(tool.vendor ?? "");
    setUrl(tool.url ?? "");
    setLogoUrl(tool.logo_url ?? "");
    setCostPerMonth(tool.cost_per_month != null ? String(tool.cost_per_month) : "");
  }, [tool.id, tool.name, tool.status, tool.category, tool.vendor, tool.url, tool.logo_url, tool.cost_per_month]);

  React.useEffect(() => {
    let cancelled = false;
    fetchStepToolsByTool(tool.id).then((data) => {
      if (!cancelled) setStepTools(data);
    }).catch(() => {
      if (!cancelled) setStepTools([]);
    });
    return () => { cancelled = true; };
  }, [tool.id]);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/steps?workspace_id=${workspace.id}`)
      .then((res) => res.json())
      .then((json: { data: Step[] | null }) => {
        if (!cancelled && json.data) {
          const map: Record<string, string> = {};
          for (const s of json.data) map[s.id] = s.tab_id;
          setStepTabMap(map);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [workspace.id]);

  const handleFieldUpdate = async (field: string, value: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await updateTool(tool.id, { [field]: value } as any);
      onUpdate(updated);
    } catch (err) {
      toastError(`Failed to update ${field}`, { error: err, retry: () => handleFieldUpdate(field, value) });
    }
  };

  const handleStatusChange = async (newStatus: ToolStatus) => {
    const previous = status;
    setStatus(newStatus);
    try {
      const updated = await updateTool(tool.id, { status: newStatus });
      onUpdate(updated);
    } catch (err) {
      setStatus(previous);
      toastError("Failed to update status", { error: err });
    }
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    clearTimeout(nameTimeoutRef.current);
    nameTimeoutRef.current = setTimeout(() => {
      if (newName.trim()) handleFieldUpdate("name", newName.trim());
    }, 500);
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    clearTimeout(categoryTimeoutRef.current);
    categoryTimeoutRef.current = setTimeout(() => {
      handleFieldUpdate("category", newCategory.trim() || null);
    }, 500);
  };

  const handleVendorChange = (newVendor: string) => {
    setVendor(newVendor);
    clearTimeout(vendorTimeoutRef.current);
    vendorTimeoutRef.current = setTimeout(() => {
      handleFieldUpdate("vendor", newVendor.trim() || null);
    }, 500);
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    clearTimeout(urlTimeoutRef.current);
    urlTimeoutRef.current = setTimeout(() => {
      handleFieldUpdate("url", newUrl.trim() || null);
    }, 500);
  };

  const handleLogoUrlChange = (newLogoUrl: string) => {
    setLogoUrl(newLogoUrl);
    clearTimeout(logoUrlTimeoutRef.current);
    logoUrlTimeoutRef.current = setTimeout(() => {
      handleFieldUpdate("logo_url", newLogoUrl.trim() || null);
    }, 500);
  };

  const handleCostChange = (newCost: string) => {
    setCostPerMonth(newCost);
    clearTimeout(costTimeoutRef.current);
    costTimeoutRef.current = setTimeout(() => {
      const parsed = newCost ? parseFloat(newCost) : null;
      handleFieldUpdate("cost_per_month", parsed);
    }, 500);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDeleteTool(tool.id);
      onDelete(tool.id);
      toast.success("Tool deleted");
    } catch (err) {
      toastError("Failed to delete tool", { error: err });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Tool Details
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
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Tool name" />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as ToolStatus)}
            aria-label="Tool status"
            className="w-full h-8 px-3 text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--signal)]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Category
          </label>
          <Input
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            placeholder="e.g., Analytics, CRM, Communication"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Vendor
          </label>
          <Input
            value={vendor}
            onChange={(e) => handleVendorChange(e.target.value)}
            placeholder="Vendor or manufacturer"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            URL
          </label>
          <Input
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Logo URL
          </label>
          <div className="flex items-center gap-2">
            {logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt=""
                className="w-8 h-8 rounded-[4px] object-contain shrink-0 border border-[var(--border-subtle)]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <Input
              value={logoUrl}
              onChange={(e) => handleLogoUrlChange(e.target.value)}
              placeholder="https://logo.clearbit.com/example.com"
              type="url"
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Cost / Month ($)
          </label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={costPerMonth}
            onChange={(e) => handleCostChange(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <Separator />

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Description
          </label>
          <RichTextEditor
            content={tool.description ?? ""}
            onChange={(html) => handleFieldUpdate("description", html)}
          />
        </div>

        <Separator />

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Step Usage
          </label>
          {stepTools.length === 0 ? (
            <p className="text-[12px] text-white/30 italic">No steps linked yet. Open a step on the canvas and assign this tool.</p>
          ) : (
            <ul className="space-y-1">
              {stepTools.map((st) => {
                const tabId = stepTabMap[st.step.id];
                return (
                  <li key={st.id}>
                    {tabId ? (
                      <button
                        onClick={() => router.push(`/w/${workspace.id}/${tabId}`)}
                        className="text-[12px] text-[var(--accent-blue)] hover:underline text-left cursor-pointer"
                      >
                        {st.step.name}
                      </button>
                    ) : (
                      <span className="text-[12px] text-[var(--text-secondary)]">
                        {st.step.name}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="w-full">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Tool
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogPrimitive.Title className="text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
              Delete Tool
            </DialogPrimitive.Title>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{tool.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Tool"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
