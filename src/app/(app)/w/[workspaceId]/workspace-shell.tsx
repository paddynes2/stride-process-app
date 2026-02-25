"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TabBar } from "@/components/layout/tab-bar";
import { WorkspaceProvider } from "@/lib/context/workspace-context";
import type { User, Organization, Workspace, Tab } from "@/types/database";

interface WorkspaceShellProps {
  user: User;
  organization: Organization;
  workspace: Workspace;
  workspaces: Workspace[];
  tabs: Tab[];
  children: React.ReactNode;
}

export function WorkspaceShell({
  user,
  organization,
  workspace,
  workspaces,
  tabs: initialTabs,
  children,
}: WorkspaceShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [tabs, setTabs] = React.useState(initialTabs);

  // Derive active tab from URL
  const pathParts = pathname.split("/");
  // /w/{workspaceId}/{tabId} → tabId is at index 3
  const urlTabId = pathParts.length >= 4 && !["teams", "people", "tools", "settings", "list"].includes(pathParts[3])
    ? pathParts[3]
    : null;

  const activeTabId = urlTabId ?? (tabs.length > 0 ? tabs[0].id : null);

  const isCanvasView = urlTabId !== null;

  const handleTabSelect = (tabId: string) => {
    router.push(`/w/${workspace.id}/${tabId}`);
  };

  const handleTabsChange = async () => {
    // Re-fetch tabs from API
    try {
      const res = await fetch(`/api/v1/workspaces/${workspace.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data?.tabs) {
          setTabs(json.data.tabs);
        }
      }
    } catch {
      // Silently fail — tabs will refresh on navigation
    }
  };

  return (
    <WorkspaceProvider
      user={user}
      organization={organization}
      workspace={workspace}
      workspaces={workspaces}
      initialTabs={tabs}
      initialTabId={activeTabId}
    >
      <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
        <Sidebar
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex flex-1 flex-col min-w-0">
          <Header userName={user.name} userEmail={user.email} />
          <main className="flex-1 overflow-hidden relative">
            {children}
          </main>
          {isCanvasView && (
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              workspaceId={workspace.id}
              onTabSelect={handleTabSelect}
              onTabsChange={handleTabsChange}
            />
          )}
        </div>
      </div>
    </WorkspaceProvider>
  );
}
