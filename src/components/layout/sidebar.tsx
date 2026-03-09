"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  GitBranch,
  LayoutDashboard,
  Users,
  User,
  Wrench,
  Settings,
  ChevronLeft,
  List,
  TrendingDown,
  Split,
  Eye,
  MessageSquare,
  ClipboardList,
  Clock,
  Target,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  workspaceId: string;
  workspaceName: string;
  workspaceImageUrl?: string | null;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  active?: (p: string, wsId: string) => boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", icon: BarChart3, href: "/dashboard" },
      { label: "Workflows", icon: GitBranch, href: "", active: (p: string, wsId: string) => {
        const base = `/w/${wsId}`;
        return p === base || (p.startsWith(base) && !p.includes("/teams") && !p.includes("/people") && !p.includes("/tools") && !p.includes("/settings") && !p.includes("/list") && !p.includes("/gap-analysis") && !p.includes("/compare") && !p.includes("/dashboard") && !p.includes("/comments") && !p.includes("/runbooks") && !p.includes("/activity") && !p.includes("/perspectives") && !p.includes("/prioritization") && !p.includes("/improvements") && !p.includes("/ai-analysis"));
      }},
      { label: "List View", icon: List, href: "/list" },
    ],
  },
  {
    label: "Analysis",
    items: [
      { label: "Gap Analysis", icon: TrendingDown, href: "/gap-analysis" },
      { label: "Compare", icon: Split, href: "/compare" },
      { label: "Perspectives", icon: Eye, href: "/perspectives/compare" },
      { label: "Prioritization", icon: Target, href: "/prioritization" },
      { label: "AI Analysis", icon: Sparkles, href: "/ai-analysis" },
    ],
  },
  {
    label: "Collaborate",
    items: [
      { label: "Improvements", icon: Lightbulb, href: "/improvements" },
      { label: "Comments", icon: MessageSquare, href: "/comments" },
      { label: "Runbooks", icon: ClipboardList, href: "/runbooks" },
      { label: "Activity", icon: Clock, href: "/activity" },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Teams", icon: Users, href: "/teams" },
      { label: "People", icon: User, href: "/people" },
      { label: "Tools", icon: Wrench, href: "/tools" },
    ],
  },
];

export function Sidebar({ workspaceId, workspaceName, workspaceImageUrl, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/w/${workspaceId}`;
  const [improvementsOpenCount, setImprovementsOpenCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    function fetchCount() {
      if (cancelled) return;
      fetch(`/api/v1/improvement-ideas?workspace_id=${workspaceId}`)
        .then((r) => r.json())
        .then((json) => {
          if (cancelled) return;
          const ideas: Array<{ status: string }> = json.data ?? [];
          const open = ideas.filter((i) => i.status !== "completed" && i.status !== "rejected").length;
          setImprovementsOpenCount(open > 0 ? open : null);
        })
        .catch(() => { if (!cancelled) setImprovementsOpenCount(null); });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") fetchCount();
    }

    fetchCount();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [workspaceId]);

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
        <Link href="/workspaces" aria-label="Back to workspaces" className="flex items-center gap-2 min-w-0 flex-1">
          {workspaceImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={workspaceImageUrl}
              alt=""
              className="shrink-0 rounded-[6px] object-contain"
              style={{ width: 24, height: 24 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 24, height: 24, borderRadius: 6, background: "var(--brand)" }}
            >
              <span className="text-white text-[11px] font-bold leading-none">S</span>
            </div>
          )}
          {!collapsed && (
            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
              {workspaceName}
            </span>
          )}
        </Link>
        {!collapsed && (
          <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Toggle sidebar">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 flex flex-col overflow-y-auto">
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={section.label} className={cn(sectionIdx > 0 && "mt-3")}>
            {collapsed ? (
              sectionIdx > 0 && (
                <div className="mx-2 mb-1 border-t border-[var(--border-subtle)]" />
              )
            ) : (
              <div className="px-2 mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-quaternary)]">
                {section.label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const href = `${basePath}${item.href}`;
                const isActive = item.active
                  ? item.active(pathname, workspaceId)
                  : pathname.startsWith(href) && href !== basePath;

                return (
                  <Link
                    key={item.label}
                    href={href}
                    aria-label={item.label}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)]",
                      "text-[var(--text-sm)] font-medium transition-colors",
                      isActive
                        ? "bg-[var(--signal-subtle)] text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-[var(--brand)]")} />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.label === "Improvements" && improvementsOpenCount != null && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-blue)] text-white">
                        {improvementsOpenCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 flex flex-col gap-0.5 border-t border-[var(--border-subtle)] pt-2">
        <Link
          href={`${basePath}/settings`}
          aria-label="Settings"
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)]",
            "text-[var(--text-sm)] font-medium transition-colors",
            pathname.startsWith(`${basePath}/settings`)
              ? "bg-[var(--signal-subtle)] text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
          )}
        >
          <Settings className={cn("h-4 w-4 shrink-0", pathname.startsWith(`${basePath}/settings`) && "text-[var(--brand)]")} />
          {!collapsed && <span>Settings</span>}
        </Link>
        <Link href="/workspaces" aria-label="All Workspaces">
          <Button variant="ghost" size="sm" aria-label="All Workspaces" className="w-full justify-start gap-2">
            <LayoutDashboard className="h-3.5 w-3.5" />
            {!collapsed && <span>All Workspaces</span>}
          </Button>
        </Link>
      </div>
    </aside>
  );
}
