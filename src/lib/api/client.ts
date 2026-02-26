// =============================================================================
// Client-side API helpers. Thin wrappers around fetch that handle the
// { data, error } envelope format returned by all /api/v1/* routes.
// =============================================================================

import type { Workspace, Tab, Section, Step, Connection, Team, Role, Person, StepRole, PublicShare, Stage, Touchpoint, TouchpointConnection } from "@/types/database";

interface ApiEnvelope<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    throw new Error(`Unexpected response type: ${contentType || "empty"}`);
  }
  const json: ApiEnvelope<T> = await res.json();
  if (json.error) {
    throw new Error(json.error.message);
  }
  if (json.data === null || json.data === undefined) {
    throw new Error("API returned null data without an error");
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export async function fetchWorkspaces(): Promise<Workspace[]> {
  // GET /api/v1/workspaces returns data: Workspace[]
  return apiFetch<Workspace[]>("/api/v1/workspaces");
}

export async function fetchWorkspace(id: string): Promise<Workspace> {
  // GET /api/v1/workspaces/:id returns data: Workspace (with tabs)
  return apiFetch<Workspace>(`/api/v1/workspaces/${id}`);
}

export async function createWorkspace(data: { name: string }): Promise<Workspace> {
  // POST /api/v1/workspaces returns data: Workspace (with tabs)
  return apiFetch<Workspace>("/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateWorkspace(id: string, data: Partial<Pick<Workspace, "name" | "is_active">>): Promise<Workspace> {
  return apiFetch<Workspace>(`/api/v1/workspaces/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteWorkspace(id: string): Promise<void> {
  await apiFetch(`/api/v1/workspaces/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export async function createTab(data: { workspace_id: string; name?: string; canvas_type?: "process" | "journey" }): Promise<Tab> {
  return apiFetch<Tab>("/api/v1/tabs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateTab(id: string, data: Partial<Pick<Tab, "name" | "position" | "viewport">>): Promise<Tab> {
  return apiFetch<Tab>(`/api/v1/tabs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteTab(id: string): Promise<void> {
  await apiFetch(`/api/v1/tabs/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function createSection(data: {
  workspace_id: string;
  tab_id: string;
  name?: string;
  position_x?: number;
  position_y?: number;
}): Promise<Section> {
  return apiFetch<Section>("/api/v1/sections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateSection(id: string, data: Partial<Omit<Section, "id" | "workspace_id" | "tab_id" | "created_at" | "updated_at">>): Promise<Section> {
  return apiFetch<Section>(`/api/v1/sections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteSection(id: string): Promise<void> {
  await apiFetch(`/api/v1/sections/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export async function createStep(data: {
  workspace_id: string;
  tab_id: string;
  section_id?: string | null;
  name?: string;
  position_x?: number;
  position_y?: number;
}): Promise<Step> {
  return apiFetch<Step>("/api/v1/steps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateStep(id: string, data: Partial<Omit<Step, "id" | "workspace_id" | "tab_id" | "created_at" | "updated_at">>): Promise<Step> {
  return apiFetch<Step>(`/api/v1/steps/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteStep(id: string): Promise<void> {
  await apiFetch(`/api/v1/steps/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export async function createConnection(data: {
  workspace_id: string;
  tab_id: string;
  source_step_id: string;
  target_step_id: string;
}): Promise<Connection> {
  return apiFetch<Connection>("/api/v1/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteConnection(id: string): Promise<void> {
  await apiFetch(`/api/v1/connections/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export type TeamWithRoles = Team & { roles: RoleWithPeople[] };
export type RoleWithPeople = Role & { people: Person[] };

export async function fetchTeams(workspaceId: string): Promise<TeamWithRoles[]> {
  return apiFetch<TeamWithRoles[]>(`/api/v1/teams?workspace_id=${workspaceId}`);
}

export async function createTeam(data: { workspace_id: string; name?: string }): Promise<Team> {
  return apiFetch<Team>("/api/v1/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateTeam(id: string, data: Partial<Pick<Team, "name">>): Promise<Team> {
  return apiFetch<Team>(`/api/v1/teams/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteTeam(id: string): Promise<void> {
  await apiFetch(`/api/v1/teams/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export async function createRole(data: { team_id: string; name?: string; hourly_rate?: number }): Promise<Role> {
  return apiFetch<Role>("/api/v1/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateRole(id: string, data: Partial<Pick<Role, "name" | "hourly_rate">>): Promise<Role> {
  return apiFetch<Role>(`/api/v1/roles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteRole(id: string): Promise<void> {
  await apiFetch(`/api/v1/roles/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function createPerson(data: { role_id: string; name?: string; email?: string }): Promise<Person> {
  return apiFetch<Person>("/api/v1/people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updatePerson(id: string, data: Partial<Pick<Person, "name" | "email">>): Promise<Person> {
  return apiFetch<Person>(`/api/v1/people/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deletePerson(id: string): Promise<void> {
  await apiFetch(`/api/v1/people/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Step-Roles (junction: step ↔ role assignment)
// ---------------------------------------------------------------------------

export type StepRoleWithDetails = StepRole & {
  role: Pick<Role, "id" | "name" | "hourly_rate"> & {
    team: Pick<Team, "id" | "name">;
  };
};

export async function fetchStepRoles(stepId: string): Promise<StepRoleWithDetails[]> {
  return apiFetch<StepRoleWithDetails[]>(`/api/v1/step-roles?step_id=${stepId}`);
}

export async function fetchStepRolesBatch(stepIds: string[]): Promise<StepRoleWithDetails[]> {
  if (stepIds.length === 0) return [];
  return apiFetch<StepRoleWithDetails[]>(`/api/v1/step-roles?step_ids=${stepIds.join(",")}`);
}

export async function createStepRole(data: { step_id: string; role_id: string }): Promise<StepRoleWithDetails> {
  return apiFetch<StepRoleWithDetails>("/api/v1/step-roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteStepRole(id: string): Promise<void> {
  await apiFetch(`/api/v1/step-roles/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Public Shares
// ---------------------------------------------------------------------------

export async function fetchShares(workspaceId: string): Promise<PublicShare[]> {
  return apiFetch<PublicShare[]>(`/api/v1/shares?workspace_id=${workspaceId}`);
}

export async function createShare(data: { workspace_id: string }): Promise<PublicShare> {
  return apiFetch<PublicShare>("/api/v1/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateShare(id: string, data: { is_active: boolean }): Promise<PublicShare> {
  return apiFetch<PublicShare>(`/api/v1/shares/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteShare(id: string): Promise<void> {
  await apiFetch(`/api/v1/shares/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Stages (journey canvas)
// ---------------------------------------------------------------------------

export async function createStage(data: {
  workspace_id: string;
  tab_id: string;
  name?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}): Promise<Stage> {
  return apiFetch<Stage>("/api/v1/stages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateStage(id: string, data: Partial<Omit<Stage, "id" | "workspace_id" | "tab_id" | "created_at" | "updated_at">>): Promise<Stage> {
  return apiFetch<Stage>(`/api/v1/stages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteStage(id: string): Promise<void> {
  await apiFetch(`/api/v1/stages/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Touchpoints (journey canvas)
// ---------------------------------------------------------------------------

export async function fetchTouchpoints(workspaceId: string, tabId?: string): Promise<Touchpoint[]> {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  if (tabId) params.set("tab_id", tabId);
  return apiFetch<Touchpoint[]>(`/api/v1/touchpoints?${params}`);
}

export async function createTouchpoint(data: {
  workspace_id: string;
  tab_id: string;
  stage_id?: string | null;
  name?: string;
  position_x?: number;
  position_y?: number;
}): Promise<Touchpoint> {
  return apiFetch<Touchpoint>("/api/v1/touchpoints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateTouchpoint(id: string, data: Partial<Omit<Touchpoint, "id" | "workspace_id" | "tab_id" | "created_at" | "updated_at">>): Promise<Touchpoint> {
  return apiFetch<Touchpoint>(`/api/v1/touchpoints/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteTouchpoint(id: string): Promise<void> {
  await apiFetch(`/api/v1/touchpoints/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Touchpoint Connections (journey canvas)
// ---------------------------------------------------------------------------

export async function createTouchpointConnection(data: {
  workspace_id: string;
  tab_id: string;
  source_touchpoint_id: string;
  target_touchpoint_id: string;
}): Promise<TouchpointConnection> {
  return apiFetch<TouchpointConnection>("/api/v1/touchpoint-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteTouchpointConnection(id: string): Promise<void> {
  await apiFetch(`/api/v1/touchpoint-connections/${id}`, { method: "DELETE" });
}

// Public data (no auth required)
export interface PublicShareData {
  workspace: { id: string; name: string };
  tabs: Array<{
    id: string;
    name: string;
    position: number;
    sections: Section[];
    steps: Step[];
    connections: Connection[];
  }>;
}

export async function fetchPublicShareData(shareId: string): Promise<PublicShareData> {
  return apiFetch<PublicShareData>(`/api/v1/public/shares/${shareId}`);
}
