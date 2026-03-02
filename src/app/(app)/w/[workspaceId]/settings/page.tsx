"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Link, Copy, Check, Plus, Eye, Pencil } from "lucide-react";
import { useWorkspace } from "@/lib/context/workspace-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  updateWorkspace,
  deleteWorkspace,
  cloneWorkspace,
  fetchShares,
  createShare,
  updateShare,
  fetchPerspectives,
  createPerspective,
  updatePerspective,
  deletePerspective,
} from "@/lib/api/client";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";
import type { PublicShare, Perspective } from "@/types/database";

export default function SettingsPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [name, setName] = React.useState(workspace.name);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [cloning, setCloning] = React.useState(false);
  const [confirmCloneOpen, setConfirmCloneOpen] = React.useState(false);

  // Share state
  const [share, setShare] = React.useState<PublicShare | null>(null);
  const [shareLoading, setShareLoading] = React.useState(true);
  const [shareToggling, setShareToggling] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Perspectives state
  const [perspectives, setPerspectives] = React.useState<Perspective[]>([]);
  const [perspectivesLoading, setPerspectivesLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      // Load shares
      try {
        const shares = await fetchShares(workspace.id);
        if (!cancelled) setShare(shares[0] ?? null);
      } catch (err) {
        if (!cancelled) toastError("Failed to load share settings", { error: err });
      } finally {
        if (!cancelled) setShareLoading(false);
      }
      // Load perspectives
      try {
        const data = await fetchPerspectives(workspace.id);
        if (!cancelled) setPerspectives(data);
      } catch (err) {
        if (!cancelled) toastError("Failed to load perspectives", { error: err });
      } finally {
        if (!cancelled) setPerspectivesLoading(false);
      }
    }
    loadSettings();
    return () => { cancelled = true; };
  }, [workspace.id]);

  const shareUrl = share
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/public/${share.share_id}`
    : "";

  const handleEnableShare = async () => {
    setShareToggling(true);
    try {
      if (share) {
        const updated = await updateShare(share.id, { is_active: true });
        setShare(updated);
        toast.success("Sharing enabled");
      } else {
        const created = await createShare({ workspace_id: workspace.id });
        setShare(created);
        toast.success("Share link created");
      }
    } catch (err) {
      toastError("Failed to enable sharing", { error: err, retry: handleEnableShare });
    } finally {
      setShareToggling(false);
    }
  };

  const handleDisableShare = async () => {
    if (!share) return;
    setShareToggling(true);
    try {
      const updated = await updateShare(share.id, { is_active: false });
      setShare(updated);
      toast.success("Sharing disabled");
    } catch (err) {
      toastError("Failed to disable sharing", { error: err, retry: handleDisableShare });
    } finally {
      setShareToggling(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateWorkspace(workspace.id, { name: name.trim() });
      toast.success("Workspace updated");
      router.refresh();
    } catch (err) {
      toastError("Failed to update workspace", { error: err });
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    setConfirmCloneOpen(false);
    setCloning(true);
    try {
      const newWorkspace = await cloneWorkspace(workspace.id);
      toast.success("Workspace duplicated");
      router.push(`/w/${newWorkspace.id}`);
    } catch (err) {
      toastError("Failed to duplicate workspace", { error: err });
    } finally {
      setCloning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteWorkspace(workspace.id);
      toast.success("Workspace deleted");
      router.push("/workspaces");
      router.refresh();
    } catch (err) {
      toastError("Failed to delete workspace", { error: err });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <div className="h-full overflow-y-auto"><div className="max-w-xl mx-auto p-8">
      <h1 className="text-[18px] font-semibold text-[var(--text-primary)] mb-6">Workspace Settings</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[var(--text-secondary)]">Workspace Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Button type="submit" loading={saving}>Save Changes</Button>
      </form>

      <Separator className="my-8" />

      {/* Public Sharing */}
      <div>
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-2">Public Sharing</h2>
        <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
          Share a read-only view of this workspace. Anyone with the link can view the process map without logging in.
        </p>

        {shareLoading ? (
          <div className="h-10 w-48 rounded-[var(--radius-md)] bg-[var(--bg-surface)] animate-pulse" />
        ) : share?.is_active ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2">
                <Link className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                <span className="text-[13px] text-[var(--text-secondary)] truncate">{shareUrl}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                aria-label="Copy share link"
              >
                {copied ? <Check className="h-4 w-4 text-[var(--accent-green)]" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisableShare}
              loading={shareToggling}
              className="text-[var(--text-tertiary)]"
            >
              Disable sharing
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={handleEnableShare} loading={shareToggling}>
            <Link className="h-4 w-4" />
            {share ? "Re-enable sharing" : "Enable sharing"}
          </Button>
        )}
      </div>

      <Separator className="my-8" />

      {/* Perspectives */}
      <PerspectivesSection
        workspaceId={workspace.id}
        perspectives={perspectives}
        setPerspectives={setPerspectives}
        loading={perspectivesLoading}
      />

      <Separator className="my-8" />

      {/* Duplicate Workspace */}
      <div>
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-2">Duplicate Workspace</h2>
        <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
          Create a full copy of &quot;{workspace.name}&quot;, including all tabs, sections, steps, connections, teams, roles, people, and tools.
        </p>
        <Button variant="outline" onClick={() => setConfirmCloneOpen(true)} loading={cloning}>
          <Copy className="h-4 w-4" />
          Duplicate Workspace
        </Button>
      </div>

      <Separator className="my-8" />

      <div>
        <h2 className="text-[14px] font-semibold text-[var(--error)] mb-2">Danger Zone</h2>
        <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
          Deleting a workspace permanently removes all tabs, sections, steps, and connections.
        </p>
        <Button variant="destructive" onClick={handleDelete} loading={deleting}>
          <Trash2 className="h-4 w-4" />
          Delete Workspace
        </Button>
      </div>
    </div></div>

    {/* Duplicate Workspace confirmation dialog */}
    <Dialog open={confirmCloneOpen} onOpenChange={setConfirmCloneOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Workspace</DialogTitle>
          <DialogDescription>
            A full copy of &quot;{workspace.name}&quot; will be created including all tabs, sections, steps, connections, teams, roles, people, and tools.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setConfirmCloneOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleClone}>
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Perspective color presets
// ---------------------------------------------------------------------------

const PERSPECTIVE_COLORS = [
  "#3B82F6", // blue
  "#14B8A6", // teal
  "#A855F7", // purple
  "#EC4899", // pink
  "#F97316", // orange
  "#EAB308", // yellow
  "#EF4444", // red
  "#22C55E", // green
];

const COLOR_NAMES: Record<string, string> = {
  "#3B82F6": "Blue",
  "#14B8A6": "Teal",
  "#A855F7": "Purple",
  "#EC4899": "Pink",
  "#F97316": "Orange",
  "#EAB308": "Yellow",
  "#EF4444": "Red",
  "#22C55E": "Green",
};

// ---------------------------------------------------------------------------
// Perspectives Section
// ---------------------------------------------------------------------------

interface PerspectivesSectionProps {
  workspaceId: string;
  perspectives: Perspective[];
  setPerspectives: React.Dispatch<React.SetStateAction<Perspective[]>>;
  loading: boolean;
}

function PerspectivesSection({ workspaceId, perspectives, setPerspectives, loading }: PerspectivesSectionProps) {
  const [adding, setAdding] = React.useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const color = PERSPECTIVE_COLORS[perspectives.length % PERSPECTIVE_COLORS.length];
      const created = await createPerspective({ workspace_id: workspaceId, name: "New Perspective", color });
      setPerspectives((prev) => [...prev, created]);
      toast.success("Perspective created");
    } catch (err) {
      toastError("Failed to create perspective", { error: err });
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<Pick<Perspective, "name" | "color" | "icon">>) => {
    try {
      const updated = await updatePerspective(id, data);
      setPerspectives((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      toastError("Failed to update perspective", { error: err });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this perspective? All annotations will be permanently removed.")) return;
    try {
      await deletePerspective(id);
      setPerspectives((prev) => prev.filter((p) => p.id !== id));
      toast.success("Perspective deleted");
    } catch (err) {
      toastError("Failed to delete perspective", { error: err });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Perspectives</h2>
        <Button onClick={handleAdd} disabled={adding} size="sm">
          <Plus className="h-3.5 w-3.5" />
          Add Perspective
        </Button>
      </div>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
        Define stakeholder viewpoints to annotate process and journey elements from different perspectives.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-[var(--radius-md)] bg-[var(--bg-surface)] animate-pulse" />
          ))}
        </div>
      ) : perspectives.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center">
          <Eye className="h-6 w-6 text-[var(--text-tertiary)] mx-auto mb-2" />
          <p className="text-[13px] text-[var(--text-secondary)] mb-1">No perspectives yet</p>
          <p className="text-[12px] text-[var(--text-tertiary)] mb-3">
            Add perspectives like &quot;Customer&quot;, &quot;Operations Manager&quot;, or &quot;IT&quot; to capture different stakeholder viewpoints.
          </p>
          <Button onClick={handleAdd} disabled={adding} size="sm">
            <Plus className="h-3.5 w-3.5" />
            Add Perspective
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {perspectives.map((p) => (
            <PerspectiveRow
              key={p.id}
              perspective={p}
              onUpdate={(data) => handleUpdate(p.id, data)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Perspective Row
// ---------------------------------------------------------------------------

interface PerspectiveRowProps {
  perspective: Perspective;
  onUpdate: (data: Partial<Pick<Perspective, "name" | "color" | "icon">>) => void;
  onDelete: () => void;
}

function PerspectiveRow({ perspective, onUpdate, onDelete }: PerspectiveRowProps) {
  const [editingName, setEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(perspective.name);
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [focusedColorIndex, setFocusedColorIndex] = React.useState(0);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const colorRef = React.useRef<HTMLDivElement>(null);
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null);
  const colorButtonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    setNameValue(perspective.name);
  }, [perspective.name]);

  React.useEffect(() => {
    if (editingName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [editingName]);

  // Close color picker on outside click
  React.useEffect(() => {
    if (!showColorPicker) return;
    function handleClick(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showColorPicker]);

  React.useEffect(() => {
    if (!showColorPicker) return;
    const currentIdx = PERSPECTIVE_COLORS.indexOf(perspective.color);
    const idx = currentIdx >= 0 ? currentIdx : 0;
    setFocusedColorIndex(idx);
    colorButtonRefs.current[idx]?.focus();
  }, [showColorPicker, perspective.color]);

  const handleColorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = (focusedColorIndex + 1) % PERSPECTIVE_COLORS.length;
      setFocusedColorIndex(next);
      colorButtonRefs.current[next]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (focusedColorIndex - 1 + PERSPECTIVE_COLORS.length) % PERSPECTIVE_COLORS.length;
      setFocusedColorIndex(prev);
      colorButtonRefs.current[prev]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowColorPicker(false);
      triggerButtonRef.current?.focus();
    }
  };

  const commitName = () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue.trim() !== perspective.name) {
      onUpdate({ name: nameValue.trim() });
    } else {
      setNameValue(perspective.name);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5">
      {/* Color swatch */}
      <div className="relative" ref={colorRef}>
        <button
          ref={triggerButtonRef}
          onClick={() => setShowColorPicker(!showColorPicker)}
          aria-expanded={showColorPicker}
          aria-label={`Change color for ${perspective.name}`}
          className="h-6 w-6 rounded-full border-2 border-[var(--border-subtle)] shrink-0 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)]"
          style={{ backgroundColor: perspective.color }}
        />
        {showColorPicker && (
          <div
            role="listbox"
            aria-label="Color options"
            onKeyDown={handleColorKeyDown}
            className="absolute top-8 left-0 z-10 flex gap-1 p-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-lg"
          >
            {PERSPECTIVE_COLORS.map((color, index) => (
              <button
                key={color}
                ref={(el) => { colorButtonRefs.current[index] = el; }}
                role="option"
                aria-selected={color === perspective.color}
                aria-label={COLOR_NAMES[color] ?? color}
                tabIndex={focusedColorIndex === index ? 0 : -1}
                onClick={() => {
                  onUpdate({ color });
                  triggerButtonRef.current?.focus();
                  setShowColorPicker(false);
                }}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)]"
                style={{
                  backgroundColor: color,
                  borderColor: color === perspective.color ? "var(--text-primary)" : "transparent",
                }}
              />
            ))}
          </div>
        )}
      </div>

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
              setNameValue(perspective.name);
              setEditingName(false);
            }
          }}
          className="h-7 flex-1 text-[13px]"
          aria-label="Perspective name"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="flex-1 text-left text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors truncate"
        >
          {perspective.name}
        </button>
      )}

      {/* Edit / Delete actions */}
      {!editingName && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditingName(true)}
          className="text-[var(--text-quaternary)] hover:text-[var(--text-secondary)]"
          aria-label={`Edit ${perspective.name}`}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        className="text-[var(--text-quaternary)] hover:text-[var(--error)]"
        aria-label={`Delete ${perspective.name}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
