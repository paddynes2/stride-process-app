-- =============================================================================
-- Journey Canvas — canvas_type discriminator + stages, touchpoints, connections
-- =============================================================================

-- New enums
CREATE TYPE canvas_type AS ENUM ('process', 'journey');
CREATE TYPE touchpoint_sentiment AS ENUM ('positive', 'neutral', 'negative');

-- Add canvas_type to tabs (existing process tabs default to 'process')
ALTER TABLE tabs ADD COLUMN canvas_type canvas_type NOT NULL DEFAULT 'process';

-- =============================================================================
-- Stages — journey equivalent of sections (horizontal swim lanes)
-- =============================================================================
CREATE TABLE stages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tab_id       UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'New Stage',
  description  TEXT,
  channel      TEXT,           -- web, phone, email, in-person, other
  owner        TEXT,
  position_x   FLOAT NOT NULL DEFAULT 0,
  position_y   FLOAT NOT NULL DEFAULT 0,
  width        FLOAT NOT NULL DEFAULT 600,
  height       FLOAT NOT NULL DEFAULT 400,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Touchpoints — journey equivalent of steps (nodes within stages)
-- =============================================================================
CREATE TABLE touchpoints (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tab_id           UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  stage_id         UUID REFERENCES stages(id) ON DELETE SET NULL,
  name             TEXT NOT NULL DEFAULT 'Untitled',
  pain_score       INT CHECK (pain_score >= 1 AND pain_score <= 5),
  gain_score       INT CHECK (gain_score >= 1 AND gain_score <= 5),
  sentiment        touchpoint_sentiment,
  customer_emotion TEXT,
  notes            TEXT,
  position_x       FLOAT NOT NULL DEFAULT 0,
  position_y       FLOAT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Touchpoint Connections — edges between touchpoints on journey canvas
-- =============================================================================
CREATE TABLE touchpoint_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tab_id               UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  source_touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
  target_touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_touchpoint_id != target_touchpoint_id),
  UNIQUE(source_touchpoint_id, target_touchpoint_id)
);

-- Updated_at triggers
CREATE TRIGGER stages_updated_at BEFORE UPDATE ON stages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER touchpoints_updated_at BEFORE UPDATE ON touchpoints FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_stages_tab ON stages(tab_id);
CREATE INDEX idx_stages_workspace ON stages(workspace_id);
CREATE INDEX idx_touchpoints_tab ON touchpoints(tab_id);
CREATE INDEX idx_touchpoints_stage ON touchpoints(stage_id);
CREATE INDEX idx_touchpoints_workspace ON touchpoints(workspace_id);
CREATE INDEX idx_tp_connections_tab ON touchpoint_connections(tab_id);
CREATE INDEX idx_tp_connections_source ON touchpoint_connections(source_touchpoint_id);
CREATE INDEX idx_tp_connections_target ON touchpoint_connections(target_touchpoint_id);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoint_connections ENABLE ROW LEVEL SECURITY;

-- Stages (workspace-scoped via can_access_workspace)
CREATE POLICY "stages_select" ON stages FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "stages_insert" ON stages FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "stages_update" ON stages FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "stages_delete" ON stages FOR DELETE
  USING (can_access_workspace(workspace_id));

-- Touchpoints (workspace-scoped via can_access_workspace)
CREATE POLICY "touchpoints_select" ON touchpoints FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "touchpoints_insert" ON touchpoints FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "touchpoints_update" ON touchpoints FOR UPDATE
  USING (can_access_workspace(workspace_id));

CREATE POLICY "touchpoints_delete" ON touchpoints FOR DELETE
  USING (can_access_workspace(workspace_id));

-- Touchpoint connections (workspace-scoped via can_access_workspace)
CREATE POLICY "tp_connections_select" ON touchpoint_connections FOR SELECT
  USING (can_access_workspace(workspace_id));

CREATE POLICY "tp_connections_insert" ON touchpoint_connections FOR INSERT
  WITH CHECK (can_access_workspace(workspace_id));

CREATE POLICY "tp_connections_delete" ON touchpoint_connections FOR DELETE
  USING (can_access_workspace(workspace_id));
