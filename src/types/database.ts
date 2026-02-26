// =============================================================================
// Database entity types — mirrors the Supabase schema
// =============================================================================

export type StepStatus = "draft" | "in_progress" | "testing" | "live" | "archived";
export type ExecutorType = "person" | "automation" | "ai_agent" | "empty";
export type WorkspaceRole = "viewer" | "member" | "admin" | "owner";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: WorkspaceRole;
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Tab {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
  viewport: { x: number; y: number; zoom: number } | null;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  workspace_id: string;
  tab_id: string;
  name: string;
  summary: string | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Step {
  id: string;
  workspace_id: string;
  tab_id: string;
  section_id: string | null;
  name: string;
  position_x: number;
  position_y: number;
  status: StepStatus;
  step_type: string | null;
  executor: ExecutorType;
  notes: string | null;
  video_url: string | null;
  attributes: Record<string, unknown>;
  time_minutes: number | null;
  frequency_per_month: number | null;
  maturity_score: number | null;
  target_maturity: number | null;
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  workspace_id: string;
  tab_id: string;
  source_step_id: string;
  target_step_id: string;
  created_at: string;
}

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  team_id: string;
  name: string;
  hourly_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  role_id: string;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface StepRole {
  id: string;
  step_id: string;
  role_id: string;
  created_at: string;
}
