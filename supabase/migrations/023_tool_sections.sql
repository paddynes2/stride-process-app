-- =============================================================================
-- Tool sections for grouping tools on the tools canvas (workspace-level)
-- =============================================================================

-- Tool sections — container nodes for organizing tools on the workspace canvas
CREATE TABLE tool_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'New Tool Section',
  description     TEXT,
  position_x      NUMERIC NOT NULL DEFAULT 0,
  position_y      NUMERIC NOT NULL DEFAULT 0,
  width           NUMERIC NOT NULL DEFAULT 600,
  height          NUMERIC NOT NULL DEFAULT 400,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER tool_sections_updated_at BEFORE UPDATE ON tool_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_tool_sections_workspace ON tool_sections(workspace_id);

-- =============================================================================
-- RLS Policies for tool_sections
-- =============================================================================

ALTER TABLE tool_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tool_sections_select" ON tool_sections FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "tool_sections_insert" ON tool_sections FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "tool_sections_update" ON tool_sections FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "tool_sections_delete" ON tool_sections FOR DELETE
  USING (can_access_workspace(workspace_id));

-- =============================================================================
-- ALTER tools table: add canvas position and lifecycle status columns
-- =============================================================================

ALTER TABLE tools
  ADD COLUMN position_x NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN position_y NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'considering', 'cancelled'));
