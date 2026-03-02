-- =============================================================================
-- Section Templates — reusable section+steps snapshots
-- =============================================================================

CREATE TABLE templates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  category       TEXT,
  template_data  JSONB NOT NULL,
  created_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger (reuses update_updated_at() from migration 015)
CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index on workspace_id for list queries
CREATE INDEX idx_templates_workspace ON templates(workspace_id);

-- =============================================================================
-- RLS Policies
-- templates have workspace_id so we can use can_access_workspace() directly
-- =============================================================================

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON templates FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "templates_insert" ON templates FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "templates_update" ON templates FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "templates_delete" ON templates FOR DELETE
  USING (can_access_workspace(workspace_id));
