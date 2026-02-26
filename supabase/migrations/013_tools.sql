-- =============================================================================
-- Tools table for tracking software, hardware, and services used in processes
-- =============================================================================

-- Tools — instruments used to execute process steps (e.g., "Salesforce", "SAP", "Excel")
CREATE TABLE tools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'New Tool',
  description     TEXT,
  category        TEXT,
  vendor          TEXT,
  url             TEXT,
  cost_per_month  NUMERIC(12,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER tools_updated_at BEFORE UPDATE ON tools FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_tools_workspace ON tools(workspace_id);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

-- Tools (workspace-scoped via can_access_workspace)
CREATE POLICY "tools_select" ON tools FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "tools_insert" ON tools FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "tools_update" ON tools FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "tools_delete" ON tools FOR DELETE
  USING (can_access_workspace(workspace_id));
