"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Link, Copy, Check } from "lucide-react";
import { useWorkspace } from "@/lib/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  updateWorkspace,
  deleteWorkspace,
  fetchShares,
  createShare,
  updateShare,
} from "@/lib/api/client";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";
import type { PublicShare } from "@/types/database";

export default function SettingsPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [name, setName] = React.useState(workspace.name);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Share state
  const [share, setShare] = React.useState<PublicShare | null>(null);
  const [shareLoading, setShareLoading] = React.useState(true);
  const [shareToggling, setShareToggling] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function loadShare() {
      try {
        const shares = await fetchShares(workspace.id);
        if (!cancelled) setShare(shares[0] ?? null);
      } catch (err) {
        if (!cancelled) toastError("Failed to load share settings", { error: err });
      } finally {
        if (!cancelled) setShareLoading(false);
      }
    }
    loadShare();
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
    <div className="max-w-xl mx-auto p-8">
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
    </div>
  );
}
