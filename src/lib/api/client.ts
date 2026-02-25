// =============================================================================
// Client-side API helpers. Thin wrappers around fetch that handle the
// { data, error } envelope format returned by all /api/v1/* routes.
// =============================================================================

import type { Workspace, Tab, Section, Step, Connection } from "@/types/database";

interface ApiResult<T> {
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
  const json: ApiResult<T> = await res.json();
  if (json.error) {
    throw new Error(json.error.message);
  }
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const result = await apiFetch<{ workspaces: Workspace[] }>("/api/v1/workspaces");
  return result.workspaces;
}

export async function fetchWorkspace(id: string): Promise<Workspace> {
  const result = await apiFetch<{ workspace: Workspace }>(`/api/v1/workspaces/${id}`);
  return result.workspace;
}

export async function createWorkspace(data: { name: string }): Promise<Workspace> {
  const result = await apiFetch<{ workspace: Workspace }>("/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.workspace;
}

export async function updateWorkspace(id: string, data: Partial<Pick<Workspace, "name" | "is_active">>): Promise<Workspace> {
  const result = await apiFetch<{ workspace: Workspace }>(`/api/v1/workspaces/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.workspace;
}

export async function deleteWorkspace(id: string): Promise<void> {
  await apiFetch(`/api/v1/workspaces/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export async function createTab(data: { workspace_id: string; name?: string }): Promise<Tab> {
  const result = await apiFetch<{ tab: Tab }>("/api/v1/tabs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.tab;
}

export async function updateTab(id: string, data: Partial<Pick<Tab, "name" | "position" | "viewport">>): Promise<Tab> {
  const result = await apiFetch<{ tab: Tab }>(`/api/v1/tabs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.tab;
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
  const result = await apiFetch<{ section: Section }>("/api/v1/sections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.section;
}

export async function updateSection(id: string, data: Partial<Omit<Section, "id" | "workspace_id" | "tab_id" | "created_at" | "updated_at">>): Promise<Section> {
  const result = await apiFetch<{ section: Section }>(`/api/v1/sections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.section;
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
  const result = await apiFetch<{ step: Step }>("/api/v1/steps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.step;
}

export async function updateStep(id: string, data: Partial<Omit<Step, "id" | "workspace_id" | "tab_id" | "created_at" | "updated_at">>): Promise<Step> {
  const result = await apiFetch<{ step: Step }>(`/api/v1/steps/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.step;
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
  const result = await apiFetch<{ connection: Connection }>("/api/v1/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result.connection;
}

export async function deleteConnection(id: string): Promise<void> {
  await apiFetch(`/api/v1/connections/${id}`, { method: "DELETE" });
}
