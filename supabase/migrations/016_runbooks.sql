-- =============================================================================
-- Runbooks — checklist instances snapshot-copied from section steps
-- =============================================================================

-- Enums
CREATE TYPE runbook_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE runbook_step_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- =============================================================================
-- runbooks table
-- =============================================================================

CREATE TABLE runbooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  section_id   UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       runbook_status NOT NULL DEFAULT 'active',
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER runbooks_updated_at
  BEFORE UPDATE ON runbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_runbooks_workspace ON runbooks(workspace_id);

-- =============================================================================
-- runbook_steps table
-- step_id ON DELETE SET NULL: if original step is deleted, runbook step remains
-- =============================================================================

CREATE TABLE runbook_steps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runbook_id   UUID NOT NULL REFERENCES runbooks(id) ON DELETE CASCADE,
  step_id      UUID REFERENCES steps(id) ON DELETE SET NULL,
  status       runbook_step_status NOT NULL DEFAULT 'pending',
  assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER runbook_steps_updated_at
  BEFORE UPDATE ON runbook_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_runbook_steps_runbook ON runbook_steps(runbook_id);
CREATE INDEX idx_runbook_steps_runbook_position ON runbook_steps(runbook_id, position);

-- =============================================================================
-- RLS Policies
-- runbooks have workspace_id — use can_access_workspace() directly
-- runbook_steps join through runbooks to get workspace_id
-- =============================================================================

ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "runbooks_select" ON runbooks FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "runbooks_insert" ON runbooks FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "runbooks_update" ON runbooks FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "runbooks_delete" ON runbooks FOR DELETE
  USING (can_access_workspace(workspace_id));

ALTER TABLE runbook_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "runbook_steps_select" ON runbook_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM runbooks r
      WHERE r.id = runbook_steps.runbook_id
        AND can_access_workspace(r.workspace_id)
    )
  );

CREATE POLICY "runbook_steps_insert" ON runbook_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM runbooks r
      WHERE r.id = runbook_steps.runbook_id
        AND can_access_workspace(r.workspace_id)
    )
  );

CREATE POLICY "runbook_steps_update" ON runbook_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM runbooks r
      WHERE r.id = runbook_steps.runbook_id
        AND can_access_workspace(r.workspace_id)
    )
  );

CREATE POLICY "runbook_steps_delete" ON runbook_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM runbooks r
      WHERE r.id = runbook_steps.runbook_id
        AND can_access_workspace(r.workspace_id)
    )
  );
