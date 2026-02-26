-- =============================================================================
-- Perspectives — stakeholder viewpoints overlaid on existing canvas elements
-- =============================================================================

-- Enum for annotatable entity types (polymorphic association)
CREATE TYPE annotatable_type AS ENUM ('step', 'section', 'touchpoint', 'stage');

-- =============================================================================
-- Perspectives — named stakeholder lenses (e.g., "Customer", "Operations Mgr")
-- =============================================================================
CREATE TABLE perspectives (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#3B82F6',  -- hex color for visual identification
  icon         TEXT,                              -- optional icon identifier
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Perspective Annotations — per-perspective notes/ratings on canvas elements
-- =============================================================================
CREATE TABLE perspective_annotations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perspective_id   UUID NOT NULL REFERENCES perspectives(id) ON DELETE CASCADE,
  annotatable_type annotatable_type NOT NULL,
  annotatable_id   UUID NOT NULL,
  content          TEXT,                     -- annotation text
  rating           INT CHECK (rating >= 1 AND rating <= 5),  -- optional 1-5 rating
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(perspective_id, annotatable_type, annotatable_id)
);

-- Updated_at triggers
CREATE TRIGGER perspectives_updated_at BEFORE UPDATE ON perspectives FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER perspective_annotations_updated_at BEFORE UPDATE ON perspective_annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_perspectives_workspace ON perspectives(workspace_id);
CREATE INDEX idx_annotations_perspective ON perspective_annotations(perspective_id);
CREATE INDEX idx_annotations_target ON perspective_annotations(annotatable_type, annotatable_id);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE perspectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE perspective_annotations ENABLE ROW LEVEL SECURITY;

-- Perspectives (workspace-scoped via can_access_workspace)
CREATE POLICY "perspectives_select" ON perspectives FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "perspectives_insert" ON perspectives FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "perspectives_update" ON perspectives FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "perspectives_delete" ON perspectives FOR DELETE
  USING (can_access_workspace(workspace_id));

-- Perspective annotations (scoped via perspective → workspace)
CREATE POLICY "annotations_select" ON perspective_annotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM perspectives p
    WHERE p.id = perspective_id AND can_access_workspace(p.workspace_id)
  ));

CREATE POLICY "annotations_insert" ON perspective_annotations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM perspectives p
    WHERE p.id = perspective_id AND can_access_workspace(p.workspace_id)
  ));

CREATE POLICY "annotations_update" ON perspective_annotations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM perspectives p
    WHERE p.id = perspective_id AND can_access_workspace(p.workspace_id)
  ));

CREATE POLICY "annotations_delete" ON perspective_annotations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM perspectives p
    WHERE p.id = perspective_id AND can_access_workspace(p.workspace_id)
  ));
