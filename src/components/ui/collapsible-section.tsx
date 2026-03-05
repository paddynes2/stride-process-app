"use client";

import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  badge?: string;
  storageKey?: string;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  badge,
  storageKey,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(() => {
    if (storageKey && typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return stored === "1";
    }
    return defaultOpen;
  });

  const handleToggle = React.useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (storageKey) localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  }, [storageKey]);

  return (
    <div className="border-b border-[var(--border-subtle)]">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 w-full py-2 text-left group"
      >
        <ChevronRight
          className="h-3 w-3 text-[var(--text-quaternary)] transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : undefined }}
        />
        {Icon && <Icon className="h-3 w-3 text-[var(--text-quaternary)]" />}
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">
          {title}
        </span>
        {badge && (
          <span className="ml-auto text-[10px] text-[var(--text-quaternary)] font-normal normal-case tracking-normal">
            {badge}
          </span>
        )}
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pb-4 space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
