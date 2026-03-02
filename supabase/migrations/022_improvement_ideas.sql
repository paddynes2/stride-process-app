-- =============================================================================
-- Improvement Ideas — workspace-scoped improvement tracking
-- =============================================================================

-- Enum for idea status
CREATE TYPE improvement_status AS ENUM ('proposed', 'approved', 'in_progress', 'completed', 'rejected');

-- Enum for idea priority
CREATE TYPE improvement_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE improvement_ideas (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT,
  status               improvement_status NOT NULL DEFAULT 'proposed',
  priority             improvement_priority NOT NULL DEFAULT 'medium',
  linked_step_id       UUID REFERENCES steps(id) ON DELETE SET NULL,
  linked_touchpoint_id UUID REFERENCES touchpoints(id) ON DELETE SET NULL,
  linked_section_id    UUID REFERENCES sections(id) ON DELETE SET NULL,
  created_by           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger (reuses update_updated_at() from migration 015)
CREATE TRIGGER improvement_ideas_updated_at
  BEFORE UPDATE ON improvement_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index on workspace_id for list queries
CREATE INDEX idx_improvement_ideas_workspace ON improvement_ideas(workspace_id);

-- =============================================================================
-- RLS Policies
-- improvement_ideas have workspace_id so we can use can_access_workspace() directly
-- =============================================================================

ALTER TABLE improvement_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "improvement_ideas_select" ON improvement_ideas FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "improvement_ideas_insert" ON improvement_ideas FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "improvement_ideas_update" ON improvement_ideas FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "improvement_ideas_delete" ON improvement_ideas FOR DELETE
  USING (can_access_workspace(workspace_id));
