-- =============================================================================
-- Tasks — step-scoped checklist items
-- =============================================================================

CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  step_id      UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  position     INTEGER NOT NULL DEFAULT 0,
  assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_step ON tasks(step_id);
CREATE INDEX idx_tasks_step_position ON tasks(step_id, position);

-- =============================================================================
-- RLS Policies
-- tasks have workspace_id so we can use can_access_workspace() directly
-- =============================================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "tasks_delete" ON tasks FOR DELETE
  USING (can_access_workspace(workspace_id));
