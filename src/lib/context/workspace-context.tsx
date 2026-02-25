"use client";

import * as React from "react";
import type { User, Organization, Workspace, Tab } from "@/types/database";

interface WorkspaceContextValue {
  user: User;
  organization: Organization;
  workspace: Workspace;
  workspaces: Workspace[];
  tabs: Tab[];
  activeTabId: string | null;
  setActiveTabId: (id: string) => void;
  refreshTabs: () => Promise<void>;
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
  children: React.ReactNode;
}

export function WorkspaceProvider({
  user,
  organization,
  workspace,
  workspaces,
  initialTabs,
  initialTabId,
  children,
}: WorkspaceProviderProps) {
  const [tabs, setTabs] = React.useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(initialTabId);

  const refreshTabs = React.useCallback(async () => {
    const res = await fetch(`/api/v1/workspaces/${workspace.id}`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.data?.tabs) {
      setTabs(json.data.tabs);
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
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
