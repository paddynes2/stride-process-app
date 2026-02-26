-- =============================================================================
-- Step-Role junction table for many-to-many assignment (drives costing)
-- =============================================================================

CREATE TABLE step_roles (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id  UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  role_id  UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (step_id, role_id)
);

-- Indexes
CREATE INDEX idx_step_roles_step ON step_roles(step_id);
CREATE INDEX idx_step_roles_role ON step_roles(role_id);

-- =============================================================================
-- RLS Policies (access via step → workspace)
-- =============================================================================

ALTER TABLE step_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "step_roles_select" ON step_roles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM steps s WHERE s.id = step_roles.step_id AND can_access_workspace(s.workspace_id)
  ));

CREATE POLICY "step_roles_insert" ON step_roles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM steps s WHERE s.id = step_roles.step_id AND can_access_workspace(s.workspace_id)
  ));

CREATE POLICY "step_roles_delete" ON step_roles FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM steps s WHERE s.id = step_roles.step_id AND can_access_workspace(s.workspace_id)
  ));
