"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/context/workspace-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { updateWorkspace, deleteWorkspace } from "@/lib/api/client";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [name, setName] = React.useState(workspace.name);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateWorkspace(workspace.id, { name: name.trim() });
      toast.success("Workspace updated");
      router.refresh();
    } catch {
      toast.error("Failed to update workspace");
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
    } catch {
      toast.error("Failed to delete workspace");
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
