"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Eye, ChevronDown, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/lib/context/workspace-context";

interface HeaderProps {
  userName: string | null;
  userEmail: string;
}

export function Header({ userName, userEmail }: HeaderProps) {
  const router = useRouter();
  const { perspectives, activePerspective, setActivePerspectiveId } = useWorkspace();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : userEmail[0].toUpperCase();

  return (
    <header
      className="flex items-center justify-between px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]"
      style={{ height: "var(--header-height)" }}
    >
      <div className="flex items-center gap-2">
        {perspectives.length > 0 && (
          <PerspectiveSwitcher
            perspectives={perspectives}
            activePerspective={activePerspective}
            onSelect={setActivePerspectiveId}
          />
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label="User menu">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 28,
                height: 28,
                background: "var(--brand)",
                fontSize: 11,
                fontWeight: 600,
                color: "white",
              }}
            >
              {initials}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-2 py-1.5">
            {userName && (
              <p className="text-[13px] font-medium text-[var(--text-primary)]">{userName}</p>
            )}
            <p className="text-[11px] text-[var(--text-tertiary)] truncate">{userEmail}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} destructive>
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

// --- Perspective Switcher ---

import type { Perspective } from "@/types/database";

function PerspectiveSwitcher({
  perspectives,
  activePerspective,
  onSelect,
}: {
  perspectives: Perspective[];
  activePerspective: Perspective | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-[var(--bg-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)]"
            style={{
              background: activePerspective
                ? `${activePerspective.color}18`
                : undefined,
              color: activePerspective
                ? activePerspective.color
                : "var(--text-tertiary)",
            }}
            aria-label="Select perspective"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="max-w-[140px] truncate">
              {activePerspective ? activePerspective.name : "Perspective"}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel>Perspectives</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => onSelect(null)}
            className={!activePerspective ? "bg-[var(--bg-surface-active)]" : ""}
          >
            <div className="h-3 w-3 rounded-full border border-[var(--border-medium)]" />
            None
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {perspectives.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={activePerspective?.id === p.id ? "bg-[var(--bg-surface-active)]" : ""}
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {activePerspective && (
        <button
          onClick={() => onSelect(null)}
          className="flex items-center justify-center h-5 w-5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)]"
          aria-label="Clear active perspective"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
