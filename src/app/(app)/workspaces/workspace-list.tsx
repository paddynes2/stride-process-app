"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createWorkspace } from "@/lib/api/client";
import type { Workspace } from "@/types/database";
import { toast } from "sonner";

interface WorkspaceListProps {
  workspaces: Workspace[];
}

export function WorkspaceList({ workspaces: initialWorkspaces }: WorkspaceListProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = React.useState(false);
  const [name, setName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    try {
      const ws = await createWorkspace({ name: name.trim() });
      toast.success("Workspace created");
      setShowCreate(false);
      setName("");
      router.push(`/w/${ws.id}`);
      router.refresh();
    } catch (err) {
      toast.error("Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
              Workspaces
            </h1>
            <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1">
              Select a workspace or create a new one
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New Workspace
          </Button>
        </div>

        {/* Grid */}
        {initialWorkspaces.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)]"
          >
            <p className="text-[var(--text-tertiary)] text-[14px] mb-4">No workspaces yet</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Create your first workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {initialWorkspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => router.push(`/w/${ws.id}`)}
                className="flex flex-col p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]
                         hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)]
                         transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex items-center justify-center"
                    style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand)" }}
                  >
                    <span className="text-white text-[13px] font-bold">{ws.name[0]?.toUpperCase()}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--text-quaternary)] group-hover:text-[var(--text-tertiary)] transition-colors" />
                </div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">{ws.name}</h3>
                <p className="text-[11px] text-[var(--text-quaternary)]">
                  Created {new Date(ws.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="flex flex-col gap-1.5 my-4">
              <label
                htmlFor="ws-name"
                style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}
              >
                Workspace name
              </label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Insurance Operating Model"
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
