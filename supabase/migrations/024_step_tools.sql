-- =============================================================================
-- Step-Tool junction table for many-to-many assignment
-- Mirrors the step_roles pattern (migration 009) exactly.
-- =============================================================================

CREATE TABLE step_tools (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id  UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  tool_id  UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (step_id, tool_id)
);

-- Indexes
CREATE INDEX idx_step_tools_step ON step_tools(step_id);
CREATE INDEX idx_step_tools_tool ON step_tools(tool_id);

-- =============================================================================
-- RLS Policies (access via step → workspace)
-- =============================================================================

ALTER TABLE step_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "step_tools_select" ON step_tools FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM steps s WHERE s.id = step_tools.step_id AND can_access_workspace(s.workspace_id)
  ));

CREATE POLICY "step_tools_insert" ON step_tools FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM steps s WHERE s.id = step_tools.step_id AND can_access_workspace(s.workspace_id)
  ));

CREATE POLICY "step_tools_delete" ON step_tools FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM steps s WHERE s.id = step_tools.step_id AND can_access_workspace(s.workspace_id)
  ));
