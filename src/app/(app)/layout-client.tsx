"use client";

import type { User, Organization, Workspace } from "@/types/database";

interface LayoutClientProps {
  user: User;
  organizations: Organization[];
  workspaces: Workspace[];
  children: React.ReactNode;
}

export function LayoutClient({ children }: LayoutClientProps) {
  // The children (workspace pages, etc.) handle their own layout
  // This wraps the app-level context if needed
  return <>{children}</>;
}
