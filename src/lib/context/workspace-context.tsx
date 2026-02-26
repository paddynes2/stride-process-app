"use client";

import * as React from "react";
import type { User, Organization, Workspace, Tab, Perspective } from "@/types/database";
import { fetchPerspectives } from "@/lib/api/client";

interface WorkspaceContextValue {
  user: User;
  organization: Organization;
  workspace: Workspace;
  workspaces: Workspace[];
  tabs: Tab[];
  activeTabId: string | null;
  setActiveTabId: (id: string) => void;
  refreshTabs: () => Promise<void>;
  perspectives: Perspective[];
  activePerspective: Perspective | null;
  setActivePerspectiveId: (id: string | null) => void;
  refreshPerspectives: () => Promise<void>;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

interface WorkspaceProviderProps {
  user: User;
  organization: Organization;
  workspace: Workspace;
  workspaces: Workspace[];
  initialTabs: Tab[];
  initialTabId: string | null;
  initialPerspectives: Perspective[];
  children: React.ReactNode;
}

export function WorkspaceProvider({
  user,
  organization,
  workspace,
  workspaces,
  initialTabs,
  initialTabId,
  initialPerspectives,
  children,
}: WorkspaceProviderProps) {
  const [tabs, setTabs] = React.useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(initialTabId);
  const [perspectives, setPerspectives] = React.useState<Perspective[]>(initialPerspectives);
  const [activePerspectiveId, setActivePerspectiveId] = React.useState<string | null>(null);

  const activePerspective = React.useMemo(
    () => perspectives.find((p) => p.id === activePerspectiveId) ?? null,
    [perspectives, activePerspectiveId]
  );

  const refreshTabs = React.useCallback(async () => {
    const res = await fetch(`/api/v1/workspaces/${workspace.id}`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.data?.tabs) {
      setTabs(json.data.tabs);
    }
  }, [workspace.id]);

  const refreshPerspectives = React.useCallback(async () => {
    try {
      const data = await fetchPerspectives(workspace.id);
      setPerspectives(data);
    } catch {
      // Silently fail — perspectives will refresh on navigation
    }
  }, [workspace.id]);

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        organization,
        workspace,
        workspaces,
        tabs,
        activeTabId,
        setActiveTabId,
        refreshTabs,
        perspectives,
        activePerspective,
        setActivePerspectiveId,
        refreshPerspectives,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
