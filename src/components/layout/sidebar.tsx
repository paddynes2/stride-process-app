"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch,
  LayoutDashboard,
  Users,
  User,
  Wrench,
  Settings,
  Plus,
  ChevronLeft,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  workspaceId: string;
  workspaceName: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

const NAV_ITEMS = [
  { label: "Workflows", icon: GitBranch, href: "", active: (p: string, wsId: string) => {
    // Active when on /w/{wsId} or /w/{wsId}/{tabId}
    const base = `/w/${wsId}`;
    return p === base || (p.startsWith(base) && !p.includes("/teams") && !p.includes("/people") && !p.includes("/tools") && !p.includes("/settings") && !p.includes("/list"));
  }},
  { label: "List View", icon: List, href: "/list" },
  { label: "Teams", icon: Users, href: "/teams", stub: true },
  { label: "People", icon: User, href: "/people", stub: true },
  { label: "Tools", icon: Wrench, href: "/tools", stub: true },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar({ workspaceId, workspaceName, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/w/${workspaceId}`;

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]",
        "transition-all duration-[var(--duration-moderate)]",
        collapsed ? "w-12" : "w-[var(--sidebar-width)]"
      )}
      style={{ height: "100vh" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-[var(--header-height)] border-b border-[var(--border-subtle)]">
        <Link href="/workspaces" className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 24, height: 24, borderRadius: 6, background: "var(--brand)" }}
          >
            <span className="text-white text-[11px] font-bold leading-none">S</span>
          </div>
          {!collapsed && (
            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
              {workspaceName}
            </span>
          )}
        </Link>
        {!collapsed && (
          <Button variant="ghost" size="icon-sm" onClick={onToggle}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive = item.active
            ? item.active(pathname, workspaceId)
            : pathname.startsWith(href) && href !== basePath;

          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)]",
                "text-[var(--text-sm)] font-medium transition-colors",
                isActive
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-[var(--brand)]")} />
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {item.stub && (
                    <span className="ml-auto text-[9px] font-medium text-[var(--text-quaternary)] uppercase">Soon</span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3">
        <Link href="/workspaces">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <LayoutDashboard className="h-3.5 w-3.5" />
            {!collapsed && <span>All Workspaces</span>}
          </Button>
        </Link>
      </div>
    </aside>
  );
}
