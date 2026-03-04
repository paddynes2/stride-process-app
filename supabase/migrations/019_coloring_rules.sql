-- =============================================================================
-- Coloring Rules — workspace-scoped conditional step coloring
-- =============================================================================

-- Enum for criteria types
CREATE TYPE criteria_type AS ENUM ('status', 'executor', 'step_type', 'has_role', 'maturity_below', 'maturity_above');

CREATE TABLE coloring_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  color          TEXT NOT NULL,
  criteria_type  criteria_type NOT NULL,
  criteria_value TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  position       INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger (reuses update_updated_at() from migration 015)
CREATE TRIGGER coloring_rules_updated_at
  BEFORE UPDATE ON coloring_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index on workspace_id for list queries
CREATE INDEX idx_coloring_rules_workspace ON coloring_rules(workspace_id);

-- =============================================================================
-- RLS Policies
-- coloring_rules have workspace_id so we can use can_access_workspace() directly
-- =============================================================================

ALTER TABLE coloring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coloring_rules_select" ON coloring_rules FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "coloring_rules_insert" ON coloring_rules FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "coloring_rules_update" ON coloring_rules FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "coloring_rules_delete" ON coloring_rules FOR DELETE
  USING (can_access_workspace(workspace_id));
